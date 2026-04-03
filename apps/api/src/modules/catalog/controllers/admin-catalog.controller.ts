import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserRole, PaginatedResult } from '@ecommerce/shared-types';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ProductService } from '../services/product.service';
import { CategoryService } from '../services/category.service';
import { BrandService } from '../services/brand.service';
import { Product } from '../schemas/product.schema';
import { Category } from '../schemas/category.schema';
import { Brand } from '../schemas/brand.schema';
import {
  ProductQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateBrandDto,
  UpdateBrandDto,
  RejectActionDto,
} from '../dto';

@ApiTags('Admin - Catalog')
@ApiBearerAuth()
@Controller('admin/catalog')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
export class AdminCatalogController {
  constructor(
    private readonly productService: ProductService,
    private readonly categoryService: CategoryService,
    private readonly brandService: BrandService,
  ) {}

  @Get('products')
  @ApiOperation({ summary: 'List all products (admin)' })
  @ApiResponse({ status: 200 })
  async listProducts(
    @Query() query: ProductQueryDto,
  ): Promise<PaginatedResult<Product>> {
    return this.productService.findAll(query);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product detail (admin)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProduct(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Product> {
    return this.productService.findById(id);
  }

  @Patch('products/:id/approve')
  @ApiOperation({ summary: 'Approve a product' })
  @ApiResponse({ status: 200 })
  async approveProduct(
    @CurrentUser('sub') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Product> {
    return this.productService.approve(id, adminUserId as string);
  }

  @Patch('products/:id/reject')
  @ApiOperation({ summary: 'Reject a product' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Rejection reason is required' })
  async rejectProduct(
    @CurrentUser('sub') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectActionDto,
  ): Promise<Product> {
    return this.productService.reject(id, adminUserId as string, dto.reason);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create category' })
  @ApiResponse({ status: 201 })
  async createCategory(@Body() dto: CreateCategoryDto): Promise<Category> {
    return this.categoryService.create(dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update category' })
  @ApiResponse({ status: 200 })
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoryService.update(id, dto);
  }

  @Post('brands')
  @ApiOperation({ summary: 'Create brand' })
  @ApiResponse({ status: 201 })
  async createBrand(@Body() dto: CreateBrandDto): Promise<Brand> {
    return this.brandService.create(dto);
  }

  @Patch('brands/:id')
  @ApiOperation({ summary: 'Update brand' })
  @ApiResponse({ status: 200 })
  async updateBrand(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBrandDto,
  ): Promise<Brand> {
    return this.brandService.update(id, dto);
  }
}
