import { IsOptional, IsEnum, IsUUID, IsString, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OfferType } from '@ecommerce/shared-types';
import { PaginationDto } from '@common/dto/pagination.dto';

export type StorefrontSortOption = 'price_asc' | 'price_desc' | 'newest' | 'featured';

export class StorefrontQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 'SA' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ enum: OfferType })
  @IsOptional()
  @IsEnum(OfferType)
  offerType?: OfferType;

  @ApiPropertyOptional({ enum: ['price_asc', 'price_desc', 'newest', 'featured'] })
  @IsOptional()
  @IsEnum(['price_asc', 'price_desc', 'newest', 'featured'])
  sort?: StorefrontSortOption;
}

