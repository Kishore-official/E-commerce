import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStockDto {
  @ApiProperty({ example: 50, description: 'New absolute stock quantity' })
  @IsInt()
  @Min(0)
  stockQuantity: number;
}
