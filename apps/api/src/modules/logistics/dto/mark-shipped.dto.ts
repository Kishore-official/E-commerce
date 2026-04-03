import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MarkShippedDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  trackingNumber: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  carrier: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingLabelUrl?: string;
}
