import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { CartStatus, OfferStatus, OfferType } from '@ecommerce/shared-types';
import { EventBusService } from '@common/events/event-bus.service';
import { Cart, CartDocument } from '../schemas/cart.schema';
import { CartItem, CartItemDocument } from '../schemas/cart-item.schema';
import { Offer, OfferDocument } from '@modules/offers/schemas/offer.schema';
import { Product, ProductDocument } from '@modules/catalog/schemas/product.schema';
import { Variant, VariantDocument } from '@modules/catalog/schemas/variant.schema';
import { ProductImage, ProductImageDocument } from '@modules/catalog/schemas/product-image.schema';
import { AddCartItemDto, UpdateCartItemDto, CartItemResponseDto, CartResponseDto } from '../dto';
import { CartConvertedEvent, CartMergedEvent } from '../events/cart.events';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectModel(Cart.name)
    private readonly cartModel: Model<CartDocument>,
    @InjectModel(CartItem.name)
    private readonly cartItemModel: Model<CartItemDocument>,
    @InjectModel(Offer.name)
    private readonly offerModel: Model<OfferDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Variant.name)
    private readonly variantModel: Model<VariantDocument>,
    @InjectModel(ProductImage.name)
    private readonly productImageModel: Model<ProductImageDocument>,
    private readonly eventBus: EventBusService,
  ) {}

  async getOrCreateCart(
    userId: string | null,
    sessionId: string | null,
    countryCode = 'IN',
  ): Promise<Cart> {
    const existing = await this.findActiveCart(userId, sessionId);
    if (existing) return existing;

    const cart = await this.cartModel.create({
      id: uuidv4(),
      userId: userId || undefined,
      sessionId: sessionId || undefined,
      countryCode,
      status: CartStatus.ACTIVE,
    });
    (cart as any).items = [];
    return cart;
  }

  async getActiveCart(
    userId: string | null,
    sessionId: string | null,
  ): Promise<CartResponseDto> {
    const cart = await this.findActiveCart(userId, sessionId);
    if (!cart) {
      return {
        id: '',
        userId,
        sessionId,
        countryCode: 'IN',
        status: CartStatus.ACTIVE,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as CartResponseDto;
    }
    return this.toResponseDto(cart);
  }

  async addItem(
    userId: string | null,
    sessionId: string | null,
    dto: AddCartItemDto,
  ): Promise<CartResponseDto> {
    const offer = await this.offerModel.findOne({ id: dto.offerId }).exec();
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    if (offer.status !== OfferStatus.ACTIVE) {
      throw new BadRequestException('Offer is not available');
    }
    if (offer.offerType !== OfferType.MARKETPLACE) {
      throw new BadRequestException('Only marketplace offers can be added to cart');
    }

    const quantity = dto.quantity ?? 1;
    const availableStock = offer.stockQuantity - offer.stockReserved;
    if (quantity > availableStock) {
      throw new BadRequestException(`Insufficient stock. Available: ${availableStock}`);
    }

    const cart = await this.getOrCreateCart(userId, sessionId, offer.countryCode);

    const existingItem = await this.cartItemModel.findOne({
      cartId: cart.id,
      offerId: dto.offerId,
    }).exec();

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (newQty > availableStock) {
        throw new BadRequestException(`Insufficient stock. Available: ${availableStock}`);
      }
      await this.cartItemModel.findOneAndUpdate(
        { id: existingItem.id },
        { $set: { quantity: newQty, priceSnapshot: offer.priceAmount, currency: offer.priceCurrency } },
        { new: true }
      ).exec();
    } else {
      await this.cartItemModel.create({
        id: uuidv4(),
        cartId: cart.id,
        offerId: dto.offerId,
        quantity,
        priceSnapshot: offer.priceAmount,
        currency: offer.priceCurrency,
      });
    }

    return this.loadCartAsDto(cart.id);
  }

  async updateItemQuantity(
    cartItemId: string,
    userId: string | null,
    sessionId: string | null,
    dto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const cart = await this.findActiveCart(userId, sessionId);
    if (!cart) throw new NotFoundException('Cart not found');

    const item = await this.cartItemModel.findOne({
      id: cartItemId,
      cartId: cart.id,
    }).exec();
    if (!item) throw new NotFoundException('Cart item not found');

    const offer = await this.offerModel.findOne({ id: item.offerId }).exec();
    if (!offer || offer.status !== OfferStatus.ACTIVE) {
      throw new BadRequestException('Offer is no longer available');
    }
    const availableStock = offer.stockQuantity - offer.stockReserved;
    if (dto.quantity > availableStock) {
      throw new BadRequestException(`Insufficient stock. Available: ${availableStock}`);
    }

    await this.cartItemModel.findOneAndUpdate(
      { id: cartItemId },
      { $set: { quantity: dto.quantity } },
      { new: true }
    ).exec();
    return this.loadCartAsDto(cart.id);
  }

  async removeItem(
    cartItemId: string,
    userId: string | null,
    sessionId: string | null,
  ): Promise<void> {
    const cart = await this.findActiveCart(userId, sessionId);
    if (!cart) throw new NotFoundException('Cart not found');

    const item = await this.cartItemModel.findOne({
      id: cartItemId,
      cartId: cart.id,
    }).exec();
    if (!item) throw new NotFoundException('Cart item not found');

    await this.cartItemModel.deleteOne({ id: cartItemId }).exec();
  }

  async clearCart(
    userId: string | null,
    sessionId: string | null,
  ): Promise<void> {
    const cart = await this.findActiveCart(userId, sessionId);
    if (!cart) return;

    await this.cartItemModel.deleteMany({ cartId: cart.id }).exec();
  }

  async mergeGuestCart(userId: string, sessionId: string): Promise<CartResponseDto> {
    const guestCart = await this.cartModel.findOne({
      sessionId,
      status: CartStatus.ACTIVE,
    }).exec();
    
    if (!guestCart) {
      const cart = await this.getOrCreateCart(userId, null);
      return this.toResponseDto(cart);
    }
    
    const guestItems = await this.cartItemModel.find({ cartId: guestCart.id }).exec();
    if (!guestItems || guestItems.length === 0) {
      const cart = await this.getOrCreateCart(userId, null);
      return this.toResponseDto(cart);
    }

    const userCart = await this.getOrCreateCart(userId, null, guestCart.countryCode);

    for (const guestItem of guestItems) {
      const existingItem = await this.cartItemModel.findOne({
        cartId: userCart.id,
        offerId: guestItem.offerId,
      }).exec();

      if (existingItem) {
        const mergedQty = existingItem.quantity + guestItem.quantity;
        // Validate merged stock
        const offer = await this.offerModel.findOne({ id: guestItem.offerId }).exec();
        if (offer && offer.status === OfferStatus.ACTIVE) {
          const availableStock = offer.stockQuantity - offer.stockReserved;
          const cappedQty = Math.min(mergedQty, availableStock);
          await this.cartItemModel.findOneAndUpdate(
            { id: existingItem.id },
            { $set: { quantity: cappedQty, priceSnapshot: offer.priceAmount } },
            { new: true }
          ).exec();
        }
      } else {
        await this.cartItemModel.create({
          id: uuidv4(),
          cartId: userCart.id,
          offerId: guestItem.offerId,
          quantity: guestItem.quantity,
          priceSnapshot: guestItem.priceSnapshot,
          currency: guestItem.currency,
        });
      }
    }

    await this.cartModel.findOneAndUpdate(
      { id: guestCart.id },
      { $set: { status: CartStatus.MERGED } },
      { new: true }
    ).exec();

    this.eventBus.emit(new CartMergedEvent(guestCart.id, userCart.id, userId));

    return this.loadCartAsDto(userCart.id);
  }

  async getCartForCheckout(userId: string): Promise<Cart> {
    const cart = await this.cartModel.findOne({
      userId,
      status: CartStatus.ACTIVE,
    }).exec();
    
    if (!cart) {
      throw new BadRequestException('Cart is empty');
    }
    
    const items = await this.cartItemModel.find({ cartId: cart.id }).exec();
    if (!items || items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }
    
    (cart as any).items = items;

    // Re-validate all offers
    for (const item of items) {
      const offer = await this.offerModel.findOne({ id: item.offerId }).exec();
      if (!offer || offer.status !== OfferStatus.ACTIVE) {
        throw new BadRequestException(
          `Offer ${item.offerId} is no longer available`,
        );
      }
      if (offer.priceAmount !== item.priceSnapshot) {
        throw new BadRequestException(
          `Price changed for offer ${item.offerId}. Was ${item.priceSnapshot}, now ${offer.priceAmount}`,
        );
      }
      const availableStock = offer.stockQuantity - offer.stockReserved;
      if (item.quantity > availableStock) {
        throw new BadRequestException(
          `Insufficient stock for offer ${item.offerId}. Requested ${item.quantity}, available ${availableStock}`,
        );
      }
    }

    return cart;
  }

  async convertCart(cartId: string, orderId: string): Promise<void> {
    const cart = await this.cartModel.findOne({ id: cartId }).exec();
    if (!cart) return;

    await this.cartModel.findOneAndUpdate(
      { id: cartId },
      { $set: { status: CartStatus.CONVERTED } },
      { new: true }
    ).exec();

    this.eventBus.emit(new CartConvertedEvent(cartId, cart.userId || '', orderId));
  }

  private async findActiveCart(
    userId: string | null,
    sessionId: string | null,
  ): Promise<Cart | null> {
    if (userId) {
      const cart = await this.cartModel.findOne({
        userId,
        status: CartStatus.ACTIVE,
      }).exec();
      if (cart) {
        const items = await this.cartItemModel.find({ cartId: cart.id }).exec();
        (cart as any).items = items;
      }
      return cart;
    }
    if (sessionId) {
      const cart = await this.cartModel.findOne({
        sessionId,
        status: CartStatus.ACTIVE,
      }).exec();
      if (cart) {
        const items = await this.cartItemModel.find({ cartId: cart.id }).exec();
        (cart as any).items = items;
      }
      return cart;
    }
    return null;
  }

  private async loadCartAsDto(cartId: string): Promise<CartResponseDto> {
    const cart = await this.cartModel.findOne({ id: cartId }).exec();
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    return this.toResponseDto(cart);
  }

  private async toResponseDto(cart: Cart): Promise<CartResponseDto> {
    const items = (cart as any).items || await this.cartItemModel.find({ cartId: cart.id }).exec();
    
    if (!items || items.length === 0) {
      return {
        id: cart.id,
        userId: cart.userId || null,
        sessionId: cart.sessionId || null,
        countryCode: cart.countryCode,
        status: cart.status,
        items: [],
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      };
    }

    // Load related data for enrichment
    const offerIds = items.map((item: CartItem) => item.offerId);
    const offers = await this.offerModel.find({ id: { $in: offerIds } }).exec();
    const offerMap = new Map(offers.map((o) => [o.id, o]));

    const productIds = [...new Set(offers.map((o) => o.productId))];
    const variantIds = [...new Set(offers.map((o) => o.variantId))];
    
    const [products, variants] = await Promise.all([
      this.productModel.find({ id: { $in: productIds } }).exec(),
      this.variantModel.find({ id: { $in: variantIds } }).exec(),
    ]);

    // Fetch images using aggregate to handle both UUID string and ObjectId productId formats
    const productObjectIds = products.map((p) => (p as any)._id).filter(Boolean);
    const imageMatchConditions: Record<string, unknown>[] = [
      { productId: { $in: productIds } },
    ];
    if (productObjectIds.length > 0) {
      imageMatchConditions.push({ productId: { $in: productObjectIds } });
    }
    const images = await this.productImageModel.aggregate([
      { $match: { $or: imageMatchConditions } },
      { $sort: { isPrimary: -1, sortOrder: 1 } },
    ]).exec();

    const productMap = new Map(products.map((p) => [p.id, p]));
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    // Build image map handling both UUID and ObjectId productId
    const imageMap = new Map<string, (typeof images)[0]>();
    for (const img of images) {
      let matchedPid = productIds.find((pid) => pid === img.productId);
      if (!matchedPid) {
        const imgPidStr = img.productId?.toString();
        const matchedProduct = products.find(
          (p) => (p as any)._id?.toString() === imgPidStr || p.id === imgPidStr,
        );
        matchedPid = matchedProduct?.id;
      }
      if (matchedPid && !imageMap.has(matchedPid)) {
        imageMap.set(matchedPid, img);
      }
    }

    const enrichedItems: CartItemResponseDto[] = items.map((item: CartItem) => {
      const offer = offerMap.get(item.offerId);
      const product = offer ? productMap.get(offer.productId) : null;
      const variant = offer ? variantMap.get(offer.variantId) : null;
      const image = offer && product ? imageMap.get(product.id) : null;

      return {
        id: item.id,
        offerId: item.offerId,
        quantity: item.quantity,
        priceSnapshot: item.priceSnapshot,
        currency: item.currency,
        productName: product?.name ?? 'Unknown Product',
        variantName: variant?.name ?? '',
        productSlug: product?.slug ?? '',
        imageUrl: image?.url ?? null,
      };
    });

    return {
      id: cart.id,
      userId: cart.userId || null,
      sessionId: cart.sessionId || null,
      countryCode: cart.countryCode,
      status: cart.status,
      items: enrichedItems,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }
}
