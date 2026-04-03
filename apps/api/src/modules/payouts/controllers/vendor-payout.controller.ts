import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@ecommerce/shared-types';
import { PaginationDto } from '@common/dto/pagination.dto';
import { PayoutService } from '../services/payout.service';

@ApiTags('Vendor - Payouts')
@ApiBearerAuth()
@Roles(UserRole.VENDOR)
@Controller('vendor/payouts')
export class VendorPayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get my balance summary' })
  async getBalance(@CurrentUser() user: { sub: string; vendorId?: string }) {
    if (!user.vendorId) throw new Error('Vendor ID not found');
    return this.payoutService.getVendorBalance(user.vendorId);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Get my earnings ledger' })
  async getLedger(
    @CurrentUser() user: { sub: string; vendorId?: string },
    @Query() query: PaginationDto,
  ) {
    if (!user.vendorId) throw new Error('Vendor ID not found');
    return this.payoutService.getVendorLedger(user.vendorId, query);
  }

  @Get()
  @ApiOperation({ summary: 'List my payouts' })
  async listPayouts(
    @CurrentUser() user: { sub: string; vendorId?: string },
    @Query() query: PaginationDto,
  ) {
    if (!user.vendorId) throw new Error('Vendor ID not found');
    return this.payoutService.findPayoutsByVendor(user.vendorId, query);
  }
}
