import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StorefrontListingImageDto {
  @ApiProperty()
  url: string;

  @ApiPropertyOptional({ nullable: true })
  altText: string | null;

  @ApiProperty()
  isPrimary: boolean;

  @ApiProperty()
  sortOrder: number;
}

export class StorefrontListingDto {
  @ApiPropertyOptional({ nullable: true, description: 'Null when product has no active offers' })
  offerId: string | null;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  productSlug: string;

  @ApiPropertyOptional({ nullable: true })
  categoryName: string | null;

  @ApiPropertyOptional({ nullable: true })
  brandName: string | null;

  @ApiPropertyOptional({ nullable: true })
  imageUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  imageAlt: string | null;

  @ApiProperty()
  variantName: string;

  @ApiProperty({ description: 'Price in minor currency units. 0 when no active offer.' })
  priceAmount: number;

  @ApiProperty()
  priceCurrency: string;

  @ApiPropertyOptional({ nullable: true })
  compareAtPrice: number | null;

  @ApiProperty()
  stockQuantity: number;

  @ApiProperty()
  offerCount: number;

  @ApiProperty()
  isFeatured: boolean;

  @ApiProperty()
  countryCode: string;

  @ApiProperty({ description: 'Whether this product has at least one active offer' })
  hasOffer: boolean;

  @ApiProperty({ type: [StorefrontListingImageDto], description: 'All product images sorted by sortOrder' })
  images: StorefrontListingImageDto[];
}

