import { Controller, Get, Post, Patch, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@ecommerce/shared-types';
import { PaginationDto } from '@common/dto/pagination.dto';
import { PayoutService } from '../services/payout.service';

@ApiTags('Admin - Payouts')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPS)
@Controller('admin/payouts')
export class AdminPayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @Get('balances')
  @ApiOperation({ summary: 'Get all vendor balances' })
  async getAllBalances(@Query() query: PaginationDto) {
    return this.payoutService.getAllVendorBalances(query);
  }

  @Get('balances/:vendorId')
  @ApiOperation({ summary: 'Get vendor balance summary' })
  async getVendorBalance(@Param('vendorId') vendorId: string) {
    return this.payoutService.getVendorBalance(vendorId);
  }

  @Get('ledger/:vendorId')
  @ApiOperation({ summary: 'Get vendor ledger entries' })
  async getVendorLedger(
    @Param('vendorId') vendorId: string,
    @Query() query: PaginationDto,
  ) {
    return this.payoutService.getVendorLedger(vendorId, query);
  }

  @Get()
  @ApiOperation({ summary: 'List all payouts' })
  async listPayouts(@Query() query: PaginationDto) {
    return this.payoutService.findAllPayouts(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payout details' })
  async getPayoutById(@Param('id') id: string) {
    return this.payoutService.getPayoutById(id);
  }

  @Post('create/:vendorId')
  @ApiOperation({ summary: 'Create a payout for a vendor' })
  async createPayout(
    @Param('vendorId') vendorId: string,
    @CurrentUser() user: { sub: string },
    @Body() body: { notes?: string },
  ) {
    return this.payoutService.createPayout(vendorId, user.sub, body.notes);
  }

  @Patch(':id/processing')
  @ApiOperation({ summary: 'Mark payout as processing' })
  async markProcessing(@Param('id') id: string) {
    return this.payoutService.markPayoutProcessing(id);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark payout as completed' })
  async markCompleted(
    @Param('id') id: string,
    @Body() body: { transactionRef: string },
    @CurrentUser() user: { sub: string },
  ) {
    return this.payoutService.markPayoutCompleted(id, body.transactionRef, user.sub);
  }
}
