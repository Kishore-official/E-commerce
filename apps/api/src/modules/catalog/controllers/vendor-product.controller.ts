import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UserRole } from '@ecommerce/shared-types';
import { PaginatedResult } from '@ecommerce/shared-types';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { ActiveVendorGuard } from '@common/guards/active-vendor.guard';
import { StorageService } from '@common/services/storage.service';
import { ProductService } from '../services/product.service';
import { VariantService } from '../services/variant.service';
import { Product } from '../schemas/product.schema';
import { Variant } from '../schemas/variant.schema';
import { ProductImage } from '../schemas/product-image.schema';
import { ProductAttribute } from '../schemas/product-attribute.schema';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  CreateVariantDto,
  UpdateVariantDto,
  AddProductImageDto,
} from '../dto';

@ApiTags('Vendor - Products')
@ApiBearerAuth()
@Controller('vendor')
@Roles(UserRole.VENDOR, UserRole.VENDOR_STAFF)
@UseGuards(ActiveVendorGuard)
export class VendorProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly variantService: VariantService,
    private readonly storageService: StorageService,
  ) {}

  @Post('products')
  @ApiOperation({ summary: 'Create a new product (draft)' })
  @ApiResponse({ status: 201, description: 'Product created' })
  async createProduct(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProductDto,
  ): Promise<Product> {
    return this.productService.create(user.vendorId!, dto);
  }

  @Get('products')
  @ApiOperation({ summary: 'List own products' })
  @ApiResponse({ status: 200 })
  async listProducts(
    @CurrentUser() user: JwtPayload,
    @Query() query: ProductQueryDto,
  ): Promise<PaginatedResult<Product>> {
    return this.productService.findByVendor(user.vendorId!, query);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get own product detail' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProduct(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Product> {
    return this.productService.findOneByVendor(id, user.vendorId!);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update own product' })
  @ApiResponse({ status: 200 })
  async updateProduct(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.productService.update(id, user.vendorId!, dto);
  }

  @Post('products/:id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit product for review' })
  @ApiResponse({ status: 200 })
  async submitForReview(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Product> {
    return this.productService.submitForReview(id, user.vendorId!);
  }

  @Patch('products/:id/archive')
  @ApiOperation({ summary: 'Archive an approved product' })
  @ApiResponse({ status: 200 })
  async archiveProduct(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Product> {
    return this.productService.archive(id, user.vendorId!);
  }

  @Post('products/:id/images')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload and add image to product' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        variantId: {
          type: 'string',
          format: 'uuid',
          nullable: true,
        },
        altText: {
          type: 'string',
          nullable: true,
        },
        sortOrder: {
          type: 'number',
          nullable: true,
        },
        isPrimary: {
          type: 'boolean',
          nullable: true,
        },
      },
    },
  })
  @ApiResponse({ status: 201 })
  async addImage(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('variantId') variantId?: string,
    @Body('altText') altText?: string,
    @Body('sortOrder') sortOrder?: string,
    @Body('isPrimary') isPrimary?: string,
  ): Promise<ProductImage> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit.');
    }

    // Also upload to GridFS for backward compatibility
    const uploadResult = await this.storageService.uploadFile(file, 'products');

    const dto: AddProductImageDto = {
      url: uploadResult.url,
      variantId: variantId || undefined,
      altText: altText || undefined,
      sortOrder: sortOrder ? parseInt(sortOrder, 10) : undefined,
      isPrimary: isPrimary === 'true' || isPrimary === '1',
      imageData: file.buffer,
      mimeType: file.mimetype,
    };

    // Save image with binary data to MongoDB
    const savedImage = await this.productService.addImage(id, user.vendorId!, dto);

    // Update URL to point to the MongoDB-backed endpoint (relative path)
    const mongoUrl = `/api/v1/images/${savedImage.id}`;
    await this.productService.updateImageUrl(savedImage.id, mongoUrl);

    const result = (savedImage as any).toJSON ? (savedImage as any).toJSON() : savedImage;
    result.url = mongoUrl;
    return result;
  }

  @Delete('products/:id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete image from product' })
  @ApiResponse({ status: 204 })
  async removeImage(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ): Promise<void> {
    return this.productService.removeImage(id, imageId, user.vendorId!);
  }

  @Post('products/:id/variants')
  @ApiOperation({ summary: 'Create variant for product' })
  @ApiResponse({ status: 201 })
  async createVariant(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVariantDto,
  ): Promise<Variant> {
    return this.variantService.create(id, user.vendorId!, dto);
  }

  @Patch('variants/:id')
  @ApiOperation({ summary: 'Update variant' })
  @ApiResponse({ status: 200 })
  async updateVariant(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVariantDto,
  ): Promise<Variant> {
    return this.variantService.update(id, user.vendorId!, dto);
  }

  @Delete('variants/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete variant (DRAFT/REJECTED products only)' })
  @ApiResponse({ status: 204 })
  async deleteVariant(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.variantService.delete(id, user.vendorId!);
  }

  @Post('products/:id/attributes')
  @ApiOperation({ summary: 'Add attribute to product' })
  @ApiResponse({ status: 201 })
  async addAttribute(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { attributeName: string; attributeValue: string; variantId?: string },
  ): Promise<ProductAttribute> {
    return this.productService.addAttribute(id, user.vendorId!, dto);
  }

  @Patch('attributes/:id')
  @ApiOperation({ summary: 'Update attribute' })
  @ApiResponse({ status: 200 })
  async updateAttribute(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { attributeName?: string; attributeValue?: string },
  ): Promise<ProductAttribute> {
    return this.productService.updateAttribute(id, user.vendorId!, dto);
  }

  @Delete('attributes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete attribute' })
  @ApiResponse({ status: 204 })
  async deleteAttribute(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.productService.removeAttribute(id, user.vendorId!);
  }
}
