import {
  Controller,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
  ConflictException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '@common/decorators';
import { UserRole } from '@ecommerce/shared-types';
import {
  SearchReindexService,
  ReindexResult,
} from '../services/search-reindex.service';
import { OpenSearchService } from '../services/opensearch.service';

@ApiTags('Admin - Search')
@ApiBearerAuth()
@Controller('admin/search')
export class AdminSearchController {
  constructor(
    private readonly reindexService: SearchReindexService,
    private readonly opensearch: OpenSearchService,
  ) {}

  @Post('reindex')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger full search reindex' })
  @ApiResponse({ status: 200, description: 'Reindex completed' })
  @ApiResponse({ status: 409, description: 'Reindex already in progress' })
  @ApiResponse({ status: 503, description: 'Search unavailable' })
  async reindex(): Promise<ReindexResult> {
    if (!this.opensearch.isAvailable()) {
      throw new ServiceUnavailableException('OpenSearch is not available');
    }
    if (this.reindexService.isReindexing()) {
      throw new ConflictException('Reindex is already in progress');
    }
    return this.reindexService.fullReindex();
  }

  @Get('status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Check search engine status' })
  @ApiResponse({ status: 200 })
  async status(): Promise<{ available: boolean; reindexing: boolean }> {
    return {
      available: this.opensearch.isAvailable(),
      reindexing: this.reindexService.isReindexing(),
    };
  }
}
