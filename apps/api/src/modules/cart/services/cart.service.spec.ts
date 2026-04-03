import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  CartStatus,
  OfferStatus,
  OfferType,
} from '@ecommerce/shared-types';
import { CartService } from './cart.service';
import { Cart } from '../schemas/cart.schema';
import { CartItem } from '../schemas/cart-item.schema';
import { Offer } from '../../offers/schemas/offer.schema';
import { Product } from '../../catalog/schemas/product.schema';
import { Variant } from '../../catalog/schemas/variant.schema';
import { ProductImage } from '../../catalog/schemas/product-image.schema';
import { EventBusService } from '@common/events/event-bus.service';

describe('CartService', () => {
  let service: CartService;
  let cartModel: any;
  let cartItemModel: any;
  let offerModel: any;
  let productModel: any;
  let variantModel: any;
  let productImageModel: any;
  let eventBus: any;

  const mockOffer: Partial<Offer> = {
    id: 'offer-1',
    productId: 'prod-1',
    variantId: 'var-1',
    vendorId: 'vendor-1',
    offerType: OfferType.MARKETPLACE,
    status: OfferStatus.ACTIVE,
    countryCode: 'SA',
    priceAmount: 50000,
    priceCurrency: 'SAR',
    stockQuantity: 10,
    stockReserved: 0,
  };

  const mockCart: Partial<Cart> = {
    id: 'cart-1',
    userId: 'user-1',
    sessionId: null,
    countryCode: 'SA',
    status: CartStatus.ACTIVE,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCartItem: Partial<CartItem> = {
    id: 'item-1',
    cartId: 'cart-1',
    offerId: 'offer-1',
    quantity: 1,
    priceSnapshot: 50000,
    currency: 'SAR',
  };

  // Helper to create a chainable mock for Mongoose queries
  function chainExec(resolvedValue: any) {
    return { exec: jest.fn().mockResolvedValue(resolvedValue) };
  }

  function chainSortExec(resolvedValue: any) {
    return {
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(resolvedValue),
      }),
      exec: jest.fn().mockResolvedValue(resolvedValue),
    };
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: getModelToken(Cart.name),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
          },
        },
        {
          provide: getModelToken(CartItem.name),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            findOneAndUpdate: jest.fn(),
            deleteOne: jest.fn(),
            deleteMany: jest.fn(),
          },
        },
        {
          provide: getModelToken(Offer.name),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getModelToken(Product.name),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getModelToken(Variant.name),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getModelToken(ProductImage.name),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    cartModel = module.get(getModelToken(Cart.name));
    cartItemModel = module.get(getModelToken(CartItem.name));
    offerModel = module.get(getModelToken(Offer.name));
    productModel = module.get(getModelToken(Product.name));
    variantModel = module.get(getModelToken(Variant.name));
    productImageModel = module.get(getModelToken(ProductImage.name));
    eventBus = module.get(EventBusService);
  });

  // The service's findActiveCart calls cartModel.findOne().exec()
  // then cartItemModel.find().exec() to load items onto the cart.
  // Many methods call findActiveCart internally, so we need to set up both mocks.

  function setupFindActiveCart(cart: any | null, items: any[] = []) {
    cartModel.findOne.mockReturnValue(chainExec(cart));
    if (cart) {
      cartItemModel.find.mockReturnValue(chainExec(items));
    }
  }

  // For loadCartAsDto and toResponseDto, the service loads the cart again,
  // loads items, offers, products, variants, and images.
  function setupLoadCartAsDto(cart: any, items: any[]) {
    // loadCartAsDto calls cartModel.findOne({ id: cartId }).exec()
    // then toResponseDto calls cartItemModel.find().exec(), offerModel.find().exec(), etc.
    cartModel.findOne.mockReturnValue(chainExec(cart));
    cartItemModel.find.mockReturnValue(chainExec(items));
    offerModel.find.mockReturnValue(chainExec([]));
    productModel.find.mockReturnValue(chainExec([]));
    variantModel.find.mockReturnValue(chainExec([]));
    productImageModel.find.mockReturnValue(chainExec([]));
  }

  describe('getOrCreateCart', () => {
    it('should return existing cart if found', async () => {
      const cart = { ...mockCart, items: [] };
      cartModel.findOne.mockReturnValue(chainExec(cart));
      cartItemModel.find.mockReturnValue(chainExec([]));

      const result = await service.getOrCreateCart('user-1', null);
      expect(result.id).toBe('cart-1');
      expect(cartModel.create).not.toHaveBeenCalled();
    });

    it('should create a new cart if none exists', async () => {
      cartModel.findOne.mockReturnValue(chainExec(null));
      const newCart = { ...mockCart, items: [] };
      cartModel.create.mockResolvedValue(newCart);

      const result = await service.getOrCreateCart('user-1', null, 'SA');
      expect(cartModel.create).toHaveBeenCalled();
      expect(result.status).toBe(CartStatus.ACTIVE);
    });

    it('should support guest carts with sessionId', async () => {
      // userId is null, sessionId is provided
      // findActiveCart: userId=null so it tries sessionId branch
      cartModel.findOne.mockReturnValue(chainExec(null));
      const newCart = { ...mockCart, userId: undefined, sessionId: 'session-abc', items: [] };
      cartModel.create.mockResolvedValue(newCart);

      const result = await service.getOrCreateCart(null, 'session-abc');
      expect(cartModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'session-abc' }),
      );
    });
  });

  describe('addItem', () => {
    it('should add item to cart with price snapshot', async () => {
      // offerModel.findOne for offer validation
      offerModel.findOne.mockReturnValue(chainExec({ ...mockOffer }));
      // findActiveCart -> finds existing cart
      cartModel.findOne
        .mockReturnValueOnce(chainExec({ ...mockCart })) // findActiveCart
        .mockReturnValueOnce(chainExec({ ...mockCart })); // loadCartAsDto -> cartModel.findOne
      cartItemModel.find
        .mockReturnValueOnce(chainExec([])) // findActiveCart items
        .mockReturnValueOnce(chainExec([{ ...mockCartItem, quantity: 2 }])); // toResponseDto items
      // No existing cart item
      cartItemModel.findOne.mockReturnValue(chainExec(null));
      // cartItemModel.create for new item
      cartItemModel.create.mockResolvedValue({ ...mockCartItem, quantity: 2 });
      // toResponseDto enrichment data
      offerModel.find.mockReturnValue(chainExec([]));
      productModel.find.mockReturnValue(chainExec([]));
      variantModel.find.mockReturnValue(chainExec([]));
      productImageModel.find.mockReturnValue(chainExec([]));

      const result = await service.addItem('user-1', null, {
        offerId: 'offer-1',
        quantity: 2,
      });

      expect(cartItemModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          offerId: 'offer-1',
          quantity: 2,
          priceSnapshot: 50000,
          currency: 'SAR',
        }),
      );
    });

    it('should reject non-ACTIVE offers', async () => {
      offerModel.findOne.mockReturnValue(
        chainExec({ ...mockOffer, status: OfferStatus.DRAFT }),
      );

      await expect(
        service.addItem('user-1', null, { offerId: 'offer-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject AFFILIATE offers', async () => {
      offerModel.findOne.mockReturnValue(
        chainExec({ ...mockOffer, offerType: OfferType.AFFILIATE }),
      );

      await expect(
        service.addItem('user-1', null, { offerId: 'offer-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if offer not found', async () => {
      offerModel.findOne.mockReturnValue(chainExec(null));

      await expect(
        service.addItem('user-1', null, { offerId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if quantity exceeds available stock', async () => {
      offerModel.findOne.mockReturnValue(
        chainExec({ ...mockOffer, stockQuantity: 5, stockReserved: 3 }),
      );

      await expect(
        service.addItem('user-1', null, { offerId: 'offer-1', quantity: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should increment quantity if item already in cart', async () => {
      offerModel.findOne.mockReturnValue(chainExec({ ...mockOffer }));
      // findActiveCart -> existing cart
      cartModel.findOne
        .mockReturnValueOnce(chainExec({ ...mockCart })) // findActiveCart
        .mockReturnValueOnce(chainExec({ ...mockCart })); // loadCartAsDto
      cartItemModel.find
        .mockReturnValueOnce(chainExec([])) // findActiveCart items
        .mockReturnValueOnce(chainExec([{ ...mockCartItem, quantity: 3 }])); // toResponseDto items
      // Existing cart item found
      cartItemModel.findOne.mockReturnValue(chainExec({ ...mockCartItem, quantity: 1 }));
      // findOneAndUpdate for updating quantity
      cartItemModel.findOneAndUpdate.mockReturnValue(
        chainExec({ ...mockCartItem, quantity: 3 }),
      );
      // toResponseDto enrichment
      offerModel.find.mockReturnValue(chainExec([]));
      productModel.find.mockReturnValue(chainExec([]));
      variantModel.find.mockReturnValue(chainExec([]));
      productImageModel.find.mockReturnValue(chainExec([]));

      await service.addItem('user-1', null, {
        offerId: 'offer-1',
        quantity: 2,
      });

      expect(cartItemModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'item-1' },
        { $set: expect.objectContaining({ quantity: 3 }) },
        { new: true },
      );
    });
  });

  describe('updateItemQuantity', () => {
    it('should update item quantity', async () => {
      // findActiveCart
      cartModel.findOne
        .mockReturnValueOnce(chainExec({ ...mockCart })) // findActiveCart
        .mockReturnValueOnce(chainExec({ ...mockCart })); // loadCartAsDto
      cartItemModel.find
        .mockReturnValueOnce(chainExec([])) // findActiveCart items
        .mockReturnValueOnce(chainExec([{ ...mockCartItem, quantity: 3 }])); // toResponseDto items
      // findOne for cart item
      cartItemModel.findOne.mockReturnValue(chainExec({ ...mockCartItem }));
      // findOne for offer (stock check)
      offerModel.findOne.mockReturnValue(chainExec({ ...mockOffer }));
      // findOneAndUpdate for quantity update
      cartItemModel.findOneAndUpdate.mockReturnValue(
        chainExec({ ...mockCartItem, quantity: 3 }),
      );
      // toResponseDto enrichment
      offerModel.find.mockReturnValue(chainExec([]));
      productModel.find.mockReturnValue(chainExec([]));
      variantModel.find.mockReturnValue(chainExec([]));
      productImageModel.find.mockReturnValue(chainExec([]));

      await service.updateItemQuantity('item-1', 'user-1', null, {
        quantity: 3,
      });

      expect(cartItemModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'item-1' },
        { $set: { quantity: 3 } },
        { new: true },
      );
    });

    it('should throw if cart not found', async () => {
      cartModel.findOne.mockReturnValue(chainExec(null));

      await expect(
        service.updateItemQuantity('item-1', 'user-1', null, { quantity: 3 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if item not found in cart', async () => {
      cartModel.findOne.mockReturnValue(chainExec({ ...mockCart }));
      cartItemModel.find.mockReturnValue(chainExec([])); // findActiveCart items
      cartItemModel.findOne.mockReturnValue(chainExec(null));

      await expect(
        service.updateItemQuantity('missing', 'user-1', null, { quantity: 3 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', async () => {
      cartModel.findOne.mockReturnValue(chainExec({ ...mockCart }));
      cartItemModel.find.mockReturnValue(chainExec([])); // findActiveCart items
      cartItemModel.findOne.mockReturnValue(chainExec({ ...mockCartItem }));
      cartItemModel.deleteOne.mockReturnValue(chainExec({ deletedCount: 1 }));

      await service.removeItem('item-1', 'user-1', null);
      expect(cartItemModel.deleteOne).toHaveBeenCalledWith({ id: 'item-1' });
    });
  });

  describe('clearCart', () => {
    it('should delete all items from cart', async () => {
      cartModel.findOne.mockReturnValue(chainExec({ ...mockCart }));
      cartItemModel.find.mockReturnValue(chainExec([])); // findActiveCart items
      cartItemModel.deleteMany.mockReturnValue(chainExec({ deletedCount: 0 }));

      await service.clearCart('user-1', null);
      expect(cartItemModel.deleteMany).toHaveBeenCalledWith({ cartId: 'cart-1' });
    });

    it('should no-op if no active cart', async () => {
      cartModel.findOne.mockReturnValue(chainExec(null));

      await service.clearCart('user-1', null);
      expect(cartItemModel.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('mergeGuestCart', () => {
    it('should merge guest items into user cart', async () => {
      const guestCart = {
        ...mockCart,
        id: 'guest-cart',
        userId: null,
        sessionId: 'session-1',
      };
      const guestItems = [{ ...mockCartItem, cartId: 'guest-cart' }];

      // cartModel.findOne calls:
      // 1. mergeGuestCart: findOne({ sessionId, status: ACTIVE }) -> guestCart
      // 2. cartItemModel.find({ cartId: guestCart.id }) -> guestItems
      // 3. getOrCreateCart -> findActiveCart (findOne({ userId })) -> null
      // 4. cartModel.create -> newUserCart
      // 5. For each guest item: cartItemModel.findOne -> null (no existing)
      // 6. cartItemModel.create for merged item
      // 7. cartModel.findOneAndUpdate for guest cart status
      // 8. loadCartAsDto -> cartModel.findOne -> userCart
      // 9. toResponseDto -> cartItemModel.find -> merged items

      cartModel.findOne
        .mockReturnValueOnce(chainExec(guestCart)) // mergeGuestCart: guest cart lookup
        .mockReturnValueOnce(chainExec(null)) // getOrCreateCart -> findActiveCart (no user cart)
        .mockReturnValueOnce(chainExec({ ...mockCart })); // loadCartAsDto

      cartItemModel.find
        .mockReturnValueOnce(chainExec(guestItems)) // guest items
        .mockReturnValueOnce(chainExec([{ ...mockCartItem }])); // toResponseDto items

      // getOrCreateCart: create new user cart
      cartModel.create.mockResolvedValue({ ...mockCart, items: [] });

      // For each guest item: check if exists in user cart
      cartItemModel.findOne.mockReturnValue(chainExec(null));
      // Create merged item
      cartItemModel.create.mockResolvedValue({ ...mockCartItem });

      // Update guest cart status
      cartModel.findOneAndUpdate.mockReturnValue(chainExec({ ...guestCart, status: CartStatus.MERGED }));

      // toResponseDto enrichment
      offerModel.find.mockReturnValue(chainExec([]));
      productModel.find.mockReturnValue(chainExec([]));
      variantModel.find.mockReturnValue(chainExec([]));
      productImageModel.find.mockReturnValue(chainExec([]));

      const result = await service.mergeGuestCart('user-1', 'session-1');

      expect(cartItemModel.create).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should return user cart if guest cart not found', async () => {
      // Guest cart not found
      cartModel.findOne
        .mockReturnValueOnce(chainExec(null)) // no guest cart
        .mockReturnValueOnce(chainExec({ ...mockCart })); // getOrCreateCart -> findActiveCart

      cartItemModel.find.mockReturnValue(chainExec([])); // findActiveCart items

      const result = await service.mergeGuestCart('user-1', 'session-1');
      expect(cartItemModel.create).not.toHaveBeenCalled();
    });
  });

  describe('getCartForCheckout', () => {
    it('should return cart when all offers are valid', async () => {
      const cart = { ...mockCart };
      const items = [{ ...mockCartItem }];

      cartModel.findOne.mockReturnValue(chainExec(cart));
      cartItemModel.find.mockReturnValue(chainExec(items));
      offerModel.findOne.mockReturnValue(chainExec({ ...mockOffer }));

      const result = await service.getCartForCheckout('user-1');
      expect((result as any).items).toHaveLength(1);
    });

    it('should throw if cart is empty', async () => {
      cartModel.findOne.mockReturnValue(chainExec(null));

      await expect(
        service.getCartForCheckout('user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if cart has no items', async () => {
      cartModel.findOne.mockReturnValue(chainExec({ ...mockCart }));
      cartItemModel.find.mockReturnValue(chainExec([]));

      await expect(
        service.getCartForCheckout('user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if offer is no longer ACTIVE', async () => {
      const cart = { ...mockCart };
      const items = [{ ...mockCartItem }];

      cartModel.findOne.mockReturnValue(chainExec(cart));
      cartItemModel.find.mockReturnValue(chainExec(items));
      offerModel.findOne.mockReturnValue(
        chainExec({ ...mockOffer, status: OfferStatus.PAUSED }),
      );

      await expect(
        service.getCartForCheckout('user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if price has changed', async () => {
      const cart = { ...mockCart };
      const items = [{ ...mockCartItem }];

      cartModel.findOne.mockReturnValue(chainExec(cart));
      cartItemModel.find.mockReturnValue(chainExec(items));
      offerModel.findOne.mockReturnValue(
        chainExec({ ...mockOffer, priceAmount: 99999 }),
      );

      await expect(
        service.getCartForCheckout('user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if stock is insufficient', async () => {
      const cart = { ...mockCart };
      const items = [{ ...mockCartItem, quantity: 10 }];

      cartModel.findOne.mockReturnValue(chainExec(cart));
      cartItemModel.find.mockReturnValue(chainExec(items));
      offerModel.findOne.mockReturnValue(
        chainExec({ ...mockOffer, stockQuantity: 5, stockReserved: 3 }),
      );

      await expect(
        service.getCartForCheckout('user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('convertCart', () => {
    it('should mark cart as CONVERTED and emit event', async () => {
      cartModel.findOne.mockReturnValue(chainExec({ ...mockCart }));
      cartModel.findOneAndUpdate.mockReturnValue(
        chainExec({ ...mockCart, status: CartStatus.CONVERTED }),
      );

      await service.convertCart('cart-1', 'order-1');

      expect(cartModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'cart-1' },
        { $set: { status: CartStatus.CONVERTED } },
        { new: true },
      );
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should no-op if cart not found', async () => {
      cartModel.findOne.mockReturnValue(chainExec(null));

      await service.convertCart('missing', 'order-1');
      expect(cartModel.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });
});
