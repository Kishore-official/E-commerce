import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminActionDto {
  @ApiPropertyOptional({
    example: 'Product images do not meet quality standards',
    description: 'Reason for rejection',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class RejectActionDto {
  @ApiProperty({
    example: 'Product images do not meet quality standards',
    description: 'Reason for rejection (required)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @MaxLength(2000)
  reason: string;
}

export class SuspendActionDto {
  @ApiProperty({
    example: 'Repeated policy violations',
    description: 'Reason for suspension (required)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Suspension reason is required' })
  @MaxLength(2000)
  reason: string;
}

