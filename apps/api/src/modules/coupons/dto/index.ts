import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDateString,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { DiscountType, CouponStatus } from '@ecommerce/shared-types';

export class CreateCouponDto {
  @ApiProperty({ example: 'WELCOME20' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: '20% off on your first order' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({ example: 20, description: 'Percentage (1-100) or fixed amount in paise' })
  @IsNumber()
  @Min(1)
  discountValue: number;

  @ApiPropertyOptional({ description: 'Max discount cap in paise (for percentage type)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ description: 'Minimum order amount in paise', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ description: 'Max total uses (0 = unlimited)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUses?: number;

  @ApiPropertyOptional({ description: 'Max uses per user (0 = unlimited)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUsesPerUser?: number;

  @ApiProperty({ example: '2026-04-01T00:00:00Z' })
  @IsDateString()
  validFrom: string;

  @ApiProperty({ example: '2026-12-31T23:59:59Z' })
  @IsDateString()
  validUntil: string;

  @ApiPropertyOptional({ description: 'Restrict to specific category IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategoryIds?: string[];

  @ApiPropertyOptional({ description: 'Restrict to specific product IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableProductIds?: string[];
}

export class UpdateCouponDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CouponStatus })
  @IsOptional()
  @IsEnum(CouponStatus)
  status?: CouponStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  discountValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUses?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUsesPerUser?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategoryIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableProductIds?: string[];
}

export class ApplyCouponDto {
  @ApiProperty({ example: 'WELCOME20' })
  @IsString()
  @IsNotEmpty()
  code: string;
}
