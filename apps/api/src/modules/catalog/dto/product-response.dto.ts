import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@ecommerce/shared-types';

export class VariantResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() sku: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() barcode: string | null;
  @ApiPropertyOptional() weightGrams: number | null;
  @ApiPropertyOptional() dimensionsCm: Record<string, number> | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty() sortOrder: number;
}

export class ProductImageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() url: string;
  @ApiPropertyOptional() altText: string | null;
  @ApiProperty() sortOrder: number;
  @ApiProperty() isPrimary: boolean;
}

export class ProductAttributeResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() attributeName: string;
  @ApiProperty() attributeValue: string;
}

export class ProductResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() vendorId: string;
  @ApiPropertyOptional() categoryId: string | null;
  @ApiPropertyOptional() brandId: string | null;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiPropertyOptional() description: string | null;
  @ApiPropertyOptional() shortDescription: string | null;
  @ApiProperty({ enum: ProductStatus }) status: ProductStatus;
  @ApiPropertyOptional() countryOfOrigin: string | null;
  @ApiPropertyOptional() metaTitle: string | null;
  @ApiPropertyOptional() metaDescription: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional({ type: [VariantResponseDto] }) variants?: VariantResponseDto[];
  @ApiPropertyOptional({ type: [ProductImageResponseDto] }) images?: ProductImageResponseDto[];
  @ApiPropertyOptional({ type: [ProductAttributeResponseDto] }) attributes?: ProductAttributeResponseDto[];
}
