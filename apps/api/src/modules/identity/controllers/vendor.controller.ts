import { Controller, Get, Post, Patch, Body, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserRole } from '@ecommerce/shared-types';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { VendorService } from '../services/vendor.service';
import { RegisterVendorDto } from '../dto/register-vendor.dto';
import { UpdateVendorDto } from '../dto/update-vendor.dto';
import { Vendor } from '../schemas/vendor.schema';

@ApiTags('Vendors')
@ApiBearerAuth()
@Controller('vendors')
@UseInterceptors(ClassSerializerInterceptor)
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post('register')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Register as a vendor (customer only)' })
  @ApiResponse({ status: 201, description: 'Vendor registration submitted' })
  @ApiResponse({ status: 400, description: 'Invalid request or user already has vendor account' })
  async register(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterVendorDto,
  ): Promise<Vendor> {
    return this.vendorService.register(user.sub, dto);
  }

  @Get('me')
  @Roles(UserRole.VENDOR, UserRole.VENDOR_STAFF)
  @ApiOperation({ summary: 'Get own vendor profile' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async getMyProfile(
    @CurrentUser() user: JwtPayload,
  ): Promise<Vendor> {
    if (!user.vendorId) {
      throw new Error('User is not associated with any vendor');
    }
    return this.vendorService.findByVendorId(user.vendorId);
  }

  @Patch('me')
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Update own vendor profile' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async updateMyProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateVendorDto,
  ): Promise<Vendor> {
    if (!user.vendorId) {
      throw new Error('User is not associated with any vendor');
    }
    return this.vendorService.updateProfile(user.vendorId, dto);
  }
}

