import { IsString, IsNotEmpty, IsOptional, ValidateNested, MaxLength, IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BuyNowItemDto {
  @ApiProperty() @IsUUID() offerId: string;
  @ApiProperty() @IsInt() @Min(1) quantity: number;
}

export class AddressDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsString() @IsNotEmpty() line1: string;
  @ApiPropertyOptional() @IsOptional() @IsString() line2?: string;
  @ApiProperty() @IsString() @IsNotEmpty() city: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiProperty() @IsString() @IsNotEmpty() postalCode: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(2) countryCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
}

export class CreateOrderDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress?: AddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'WELCOME20', description: 'Coupon code to apply' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ type: [BuyNowItemDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BuyNowItemDto)
  buyNowItems?: BuyNowItemDto[];
}
