import { IsUUID, IsNotEmpty, IsArray, ArrayMinSize, ValidateNested, IsInt, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ShipmentItemDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  orderItemId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateShipmentDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ type: [ShipmentItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ShipmentItemDto)
  items: ShipmentItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingNumber?: string;
}
