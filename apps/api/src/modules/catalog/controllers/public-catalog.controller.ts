import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@common/decorators';
import { ProductService } from '../services/product.service';
import { CategoryService } from '../services/category.service';
import { BrandService } from '../services/brand.service';
import { Category } from '../schemas/category.schema';
import { Brand } from '../schemas/brand.schema';
import { Product } from '../schemas/product.schema';
import { Variant } from '../schemas/variant.schema';

@ApiTags('Catalog')
@Controller('catalog')
export class PublicCatalogController {
  constructor(
    private readonly productService: ProductService,
    private readonly categoryService: CategoryService,
    private readonly brandService: BrandService,
  ) {}

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'List active categories (tree structure)' })
  @ApiResponse({ status: 200, description: 'Category tree' })
  async listCategories(): Promise<Category[]> {
    return this.categoryService.findActiveTree();
  }

  @Public()
  @Get('categories/all-with-images')
  @ApiOperation({ summary: 'List all active categories with image counts' })
  @ApiResponse({ status: 200, description: 'All categories with image counts' })
  async listAllCategoriesWithImages(): Promise<Array<Category & { imageCount: number; sampleImageUrl?: string }>> {
    return this.categoryService.findAllWithImageCounts();
  }

  @Public()
  @Get('categories/:slug')
  @ApiOperation({ summary: 'Get category by slug' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getCategoryBySlug(@Param('slug') slug: string): Promise<Category> {
    return this.categoryService.findBySlug(slug);
  }

  @Public()
  @Get('brands')
  @ApiOperation({ summary: 'List active brands' })
  @ApiResponse({ status: 200 })
  async listBrands(): Promise<Brand[]> {
    return this.brandService.findActive();
  }

  @Public()
  @Get('products/:slug')
  @ApiOperation({ summary: 'Get approved product by slug' })
  @ApiResponse({ status: 200, description: 'Product detail' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductBySlug(@Param('slug') slug: string): Promise<Product> {
    return this.productService.findBySlug(slug);
  }

  @Public()
  @Get('products/:id/variants')
  @ApiOperation({ summary: 'List active variants for an approved product' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async listVariants(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Variant[]> {
    return this.productService.findVariantsByProductId(id);
  }
}
