import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from './schemas/category.schema';
import { Brand, BrandSchema } from './schemas/brand.schema';
import { Product, ProductSchema } from './schemas/product.schema';
import { Variant, VariantSchema } from './schemas/variant.schema';
import { ProductImage, ProductImageSchema } from './schemas/product-image.schema';
import { ProductAttribute, ProductAttributeSchema } from './schemas/product-attribute.schema';
import { ProductService } from './services/product.service';
import { VariantService } from './services/variant.service';
import { CategoryService } from './services/category.service';
import { BrandService } from './services/brand.service';
import { PublicCatalogController } from './controllers/public-catalog.controller';
import { VendorProductController } from './controllers/vendor-product.controller';
import { AdminCatalogController } from './controllers/admin-catalog.controller';
import { ImageController } from './controllers/image.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Brand.name, schema: BrandSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Variant.name, schema: VariantSchema },
      { name: ProductImage.name, schema: ProductImageSchema },
      { name: ProductAttribute.name, schema: ProductAttributeSchema },
    ]),
  ],
  controllers: [
    PublicCatalogController,
    VendorProductController,
    AdminCatalogController,
    ImageController,
  ],
  providers: [ProductService, VariantService, CategoryService, BrandService],
  exports: [MongooseModule, ProductService],
})
export class CatalogModule {}
