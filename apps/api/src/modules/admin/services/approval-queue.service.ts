import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VendorStatus } from '@ecommerce/shared-types';
import { ProductStatus } from '@ecommerce/shared-types';
import { OfferStatus } from '@ecommerce/shared-types';
import { Vendor, VendorDocument } from '../../identity/schemas/vendor.schema';
import { Product, ProductDocument } from '../../catalog/schemas/product.schema';
import { Offer, OfferDocument } from '../../offers/schemas/offer.schema';

@Injectable()
export class ApprovalQueueService {
  constructor(
    @InjectModel(Vendor.name)
    private readonly vendorModel: Model<VendorDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Offer.name)
    private readonly offerModel: Model<OfferDocument>,
  ) {}

  async getSummary(): Promise<{
    vendors: { pending: number };
    products: { pendingReview: number };
    offers: { pendingReview: number };
  }> {
    const [pendingVendors, pendingProducts, pendingOffers] = await Promise.all([
      this.vendorModel.countDocuments({ status: VendorStatus.PENDING }).exec(),
      this.productModel.countDocuments({ status: ProductStatus.PENDING_REVIEW }).exec(),
      this.offerModel.countDocuments({ status: OfferStatus.PENDING_REVIEW }).exec(),
    ]);

    return {
      vendors: { pending: pendingVendors },
      products: { pendingReview: pendingProducts },
      offers: { pendingReview: pendingOffers },
    };
  }
}
