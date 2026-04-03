import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Offer, OfferSchema } from '@modules/offers/schemas/offer.schema';
import { Product, ProductSchema } from '@modules/catalog/schemas/product.schema';
import { Variant, VariantSchema } from '@modules/catalog/schemas/variant.schema';
import { Category, CategorySchema } from '@modules/catalog/schemas/category.schema';
import { Brand, BrandSchema } from '@modules/catalog/schemas/brand.schema';
import { ProductImage, ProductImageSchema } from '@modules/catalog/schemas/product-image.schema';
import { ProductAttribute, ProductAttributeSchema } from '@modules/catalog/schemas/product-attribute.schema';

import { OpenSearchService } from './services/opensearch.service';
import { SearchIndexingService } from './services/search-indexing.service';
import { SearchQueryService } from './services/search-query.service';
import { SearchReindexService } from './services/search-reindex.service';

import { SearchIndexListener } from './listeners/search-index.listener';

import { SearchController } from './controllers/search.controller';
import { AdminSearchController } from './controllers/admin-search.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Offer.name, schema: OfferSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Variant.name, schema: VariantSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Brand.name, schema: BrandSchema },
      { name: ProductImage.name, schema: ProductImageSchema },
      { name: ProductAttribute.name, schema: ProductAttributeSchema },
    ]),
  ],
  controllers: [SearchController, AdminSearchController],
  providers: [
    OpenSearchService,
    SearchIndexingService,
    SearchQueryService,
    SearchReindexService,
    SearchIndexListener,
  ],
  exports: [OpenSearchService, SearchIndexingService],
})
export class SearchModule {}
