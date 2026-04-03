import { IsString, MinLength, MaxLength, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterVendorDto {
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
  phone?: string;

  @ApiPropertyOptional({ example: 'A brief description of the business' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

