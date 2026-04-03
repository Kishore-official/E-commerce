import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserRole, PaginatedResult } from '@ecommerce/shared-types';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { VendorService } from '../services/vendor.service';
import { UsersService } from '../services/users.service';
import { Vendor } from '../schemas/vendor.schema';
import { VendorQueryDto, RejectActionDto, SuspendActionDto, AdminCreateVendorDto } from '../dto';

@ApiTags('Admin - Identity')
@ApiBearerAuth()
@Controller('admin/identity')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
export class AdminIdentityController {
  constructor(
    private readonly vendorService: VendorService,
    private readonly usersService: UsersService,
  ) {}

  @Get('vendors')
  @ApiOperation({ summary: 'List all vendors' })
  @ApiResponse({ status: 200 })
  async listVendors(
    @Query() query: VendorQueryDto,
  ): Promise<PaginatedResult<Vendor>> {
    return this.vendorService.findAll({
      page: query.page,
      limit: query.limit,
      status: query.status,
    });
  }

  @Get('vendors/:id')
  @ApiOperation({ summary: 'Get vendor detail' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async getVendor(
    @Param('id', ParseUUIDPipe) vendorId: string,
  ) {
    const vendor = await this.vendorService.findById(vendorId);
    const user = await this.usersService.findById(vendor.userId);
    const vendorObj = (vendor as any).toJSON ? (vendor as any).toJSON() : { ...vendor };
    return {
      ...vendorObj,
      user: user
        ? { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName }
        : null,
    };
  }

  @Post('vendors')
  @ApiOperation({ summary: 'Create a vendor (admin only)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'User already has a vendor account' })
  async createVendor(
    @CurrentUser() admin: JwtPayload,
    @Body() dto: AdminCreateVendorDto,
  ): Promise<Vendor> {
    return this.vendorService.createByAdmin(dto, admin.sub);
  }

  @Patch('vendors/:id/approve')
  @ApiOperation({ summary: 'Approve a vendor' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async approveVendor(
    @CurrentUser() admin: JwtPayload,
    @Param('id', ParseUUIDPipe) vendorId: string,
  ): Promise<Vendor> {
    return this.vendorService.approve(vendorId, admin.sub);
  }

  @Patch('vendors/:id/reject')
  @ApiOperation({ summary: 'Reject a vendor' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Rejection reason is required' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async rejectVendor(
    @CurrentUser() admin: JwtPayload,
    @Param('id', ParseUUIDPipe) vendorId: string,
    @Body() dto: RejectActionDto,
  ): Promise<Vendor> {
    return this.vendorService.reject(vendorId, admin.sub, dto.reason);
  }

  @Patch('vendors/:id/suspend')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Suspend a vendor' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Suspension reason is required' })
  @ApiResponse({ status: 403, description: 'Moderators cannot suspend vendors' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async suspendVendor(
    @CurrentUser() admin: JwtPayload,
    @Param('id', ParseUUIDPipe) vendorId: string,
    @Body() dto: SuspendActionDto,
  ): Promise<Vendor> {
    return this.vendorService.suspend(vendorId, admin.sub, dto.reason);
  }
}

