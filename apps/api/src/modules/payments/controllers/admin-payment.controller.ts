import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole, PaginatedResult } from '@ecommerce/shared-types';
import { Roles } from '@common/decorators/roles.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { PaymentService } from '../services/payment.service';
import { Payment } from '../schemas/payment.schema';

@ApiTags('Admin - Payments')
@ApiBearerAuth()
@Controller('admin/payments')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPS)
export class AdminPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @ApiOperation({ summary: 'List all payments (admin)' })
  async listPayments(
    @Query() query: PaginationDto,
  ): Promise<PaginatedResult<Payment>> {
    return this.paymentService.findAll(query);
  }
}
