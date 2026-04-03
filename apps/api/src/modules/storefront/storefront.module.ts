import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogModule } from '../catalog/catalog.module';
import { OffersModule } from '../offers/offers.module';
import { Offer, OfferSchema } from '../offers/schemas/offer.schema';
import { Product, ProductSchema } from '../catalog/schemas/product.schema';
import { Variant, VariantSchema } from '../catalog/schemas/variant.schema';
import { ProductImage, ProductImageSchema } from '../catalog/schemas/product-image.schema';
import { ProductAttribute, ProductAttributeSchema } from '../catalog/schemas/product-attribute.schema';
import { Category, CategorySchema } from '../catalog/schemas/category.schema';
import { Brand, BrandSchema } from '../catalog/schemas/brand.schema';
import { Review, ReviewSchema } from '../reviews/schemas/review.schema';
import { StorefrontController } from './controllers/storefront.controller';
import { StorefrontService } from './services/storefront.service';
import { RecommendationService } from './services/recommendation.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Offer.name, schema: OfferSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Variant.name, schema: VariantSchema },
      { name: ProductImage.name, schema: ProductImageSchema },
      { name: ProductAttribute.name, schema: ProductAttributeSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Brand.name, schema: BrandSchema },
      { name: Review.name, schema: ReviewSchema },
    ]),
    CatalogModule,
    OffersModule,
  ],
  controllers: [StorefrontController],
  providers: [StorefrontService, RecommendationService],
  exports: [StorefrontService],
})
export class StorefrontModule {}

