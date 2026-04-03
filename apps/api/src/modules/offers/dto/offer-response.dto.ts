import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OfferType, OfferStatus, FulfillmentType } from '@ecommerce/shared-types';

export class OfferResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() productId: string;
  @ApiProperty() variantId: string;
  @ApiProperty() vendorId: string;
  @ApiProperty({ enum: OfferType }) offerType: OfferType;
  @ApiProperty({ enum: OfferStatus }) status: OfferStatus;
  @ApiProperty() countryCode: string;
  @ApiProperty() priceAmount: number;
  @ApiProperty() priceCurrency: string;
  @ApiPropertyOptional() compareAtPrice: number | null;
  @ApiPropertyOptional() costPrice: number | null;
  @ApiProperty() stockQuantity: number;
  @ApiProperty() stockReserved: number;
  @ApiPropertyOptional() affiliateUrl: string | null;
  @ApiPropertyOptional() affiliateCommissionPct: number | null;
  @ApiProperty({ enum: FulfillmentType }) fulfillmentType: FulfillmentType;
  @ApiProperty() isFeatured: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
