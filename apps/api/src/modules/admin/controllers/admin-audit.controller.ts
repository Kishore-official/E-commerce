import {
  Controller,
  Get,
  Param,
  Query,
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
import { AuditService } from '../services/audit.service';
import { ApprovalQueueService } from '../services/approval-queue.service';
import { AuditLog } from '../schemas/audit-log.schema';
import { AuditLogQueryDto } from '../dto';
import { buildPaginatedResult } from '@common/utils/pagination.util';

@ApiTags('Admin - Audit')
@ApiBearerAuth()
@Controller('admin/audit-logs')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
export class AdminAuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly approvalQueueService: ApprovalQueueService,
  ) {}

  @Get('approval-queue/summary')
  @ApiOperation({ summary: 'Get approval queue summary' })
  @ApiResponse({ status: 200 })
  async getApprovalQueueSummary(): Promise<{
    vendors: { pending: number };
    products: { pendingReview: number };
    offers: { pendingReview: number };
  }> {
    return this.approvalQueueService.getSummary();
  }

  @Get()
  @ApiOperation({ summary: 'List audit logs' })
  @ApiResponse({ status: 200 })
  async listAuditLogs(
    @Query() query: AuditLogQueryDto,
  ): Promise<PaginatedResult<AuditLog>> {
    const result = await this.auditService.findAll({
      entityType: query.entityType,
      entityId: query.entityId,
      action: query.action,
      userId: query.userId,
      page: query.page,
      limit: query.limit,
    });

    return buildPaginatedResult(result.data, result.totalItems, query.page, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log detail' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  async getAuditLog(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuditLog> {
    return this.auditService.findById(id);
  }
}

