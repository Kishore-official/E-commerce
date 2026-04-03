import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VendorStatus } from '@ecommerce/shared-types';
import { PaginationDto } from '@common/dto/pagination.dto';

export class VendorQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: VendorStatus })
  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;
}

