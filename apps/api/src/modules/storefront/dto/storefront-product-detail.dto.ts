import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OfferType, FulfillmentType } from '@ecommerce/shared-types';

export class StorefrontOfferDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  priceAmount: number;

  @ApiProperty()
  priceCurrency: string;

  @ApiPropertyOptional({ nullable: true })
  compareAtPrice: number | null;

  @ApiProperty()
  stockQuantity: number;

  @ApiProperty({ enum: OfferType })
  offerType: OfferType;

  @ApiProperty({ enum: FulfillmentType })
  fulfillmentType: FulfillmentType;

  @ApiProperty()
  vendorId: string;

  @ApiProperty()
  isFeatured: boolean;
}

export class StorefrontVariantDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  sku: string;

  @ApiProperty({ type: [StorefrontOfferDto] })
  offers: StorefrontOfferDto[];
}

export class StorefrontProductImageDto {
  @ApiProperty()
  url: string;

  @ApiPropertyOptional({ nullable: true })
  altText: string | null;

  @ApiProperty()
  isPrimary: boolean;

  @ApiProperty()
  sortOrder: number;
}

export class StorefrontProductAttributeDto {
  @ApiProperty()
  attributeName: string;

  @ApiProperty()
  attributeValue: string;
}

export class StorefrontProductDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiPropertyOptional({ nullable: true })
  shortDescription: string | null;

  @ApiPropertyOptional({ nullable: true })
  categoryName: string | null;

  @ApiPropertyOptional({ nullable: true })
  categorySlug: string | null;

  @ApiPropertyOptional({ nullable: true })
  brandName: string | null;

  @ApiPropertyOptional({ nullable: true })
  metaTitle: string | null;

  @ApiPropertyOptional({ nullable: true })
  metaDescription: string | null;

  @ApiPropertyOptional({ nullable: true })
  countryOfOrigin: string | null;

  @ApiProperty({ type: [StorefrontProductImageDto] })
  images: StorefrontProductImageDto[];

  @ApiProperty({ type: [StorefrontProductAttributeDto] })
  attributes: StorefrontProductAttributeDto[];
}

export class StorefrontProductDetailDto {
  @ApiProperty({ type: StorefrontProductDto })
  product: StorefrontProductDto;

  @ApiProperty({ type: [StorefrontVariantDto] })
  variants: StorefrontVariantDto[];
}

