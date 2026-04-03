import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  IsNumber,
  IsBoolean,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OfferType, FulfillmentType } from '@ecommerce/shared-types';

export class CreateOfferDto {
  @ApiProperty({ example: 'uuid-of-product' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 'uuid-of-variant' })
  @IsUUID()
  @IsNotEmpty()
  variantId: string;

  @ApiProperty({ enum: OfferType, example: OfferType.MARKETPLACE })
  @IsEnum(OfferType)
  offerType: OfferType;

  @ApiPropertyOptional({ example: 'SA', default: 'SA' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  countryCode?: string;

  @ApiProperty({
    example: 449900,
    description: 'Price in minor currency units (e.g. halalah for SAR)',
  })
  @IsInt()
  @Min(1)
  priceAmount: number;

  @ApiPropertyOptional({ example: 'SAR', default: 'SAR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  priceCurrency?: string;

  @ApiPropertyOptional({ example: 519900 })
  @IsOptional()
  @IsInt()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional({ example: 300000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({
    example: 25,
    description: 'Required for marketplace offers',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional({
    example: 'https://affiliate.example.com/product',
    description: 'Required for affiliate offers',
  })
  @ValidateIf((o) => o.offerType === OfferType.AFFILIATE)
  @IsUrl()
  @MaxLength(2000)
  affiliateUrl?: string;

  @ApiPropertyOptional({ example: 5.5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  affiliateCommissionPct?: number;

  @ApiPropertyOptional({ enum: FulfillmentType, default: FulfillmentType.VENDOR })
  @IsOptional()
  @IsEnum(FulfillmentType)
  fulfillmentType?: FulfillmentType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
