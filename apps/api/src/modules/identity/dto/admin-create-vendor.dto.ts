import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VendorStatus } from '@ecommerce/shared-types';

export class AdminCreateVendorDto {
  // User fields
  @ApiProperty({ example: 'vendor@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @ApiPropertyOptional({ example: '+966501234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  // Vendor fields
  @ApiProperty({ example: 'My Business Name' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  businessName: string;

  @ApiProperty({ example: 'business@example.com' })
  @IsEmail()
  businessEmail: string;

  @ApiPropertyOptional({ example: '+966501234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  businessPhone?: string;

  @ApiPropertyOptional({ example: 'A brief description of the business' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // Admin can set initial status
  @ApiPropertyOptional({
    enum: VendorStatus,
    default: VendorStatus.PENDING,
    description: 'Initial vendor status. If APPROVED, user role is set to VENDOR immediately.',
  })
  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;
}

