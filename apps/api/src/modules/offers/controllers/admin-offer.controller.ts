import {
  Controller,
  Get,
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
import { RejectActionDto } from '../../catalog/dto';
import { OfferService } from '../services/offer.service';
import { Offer } from '../schemas/offer.schema';
import { OfferQueryDto } from '../dto';

@ApiTags('Admin - Offers')
@ApiBearerAuth()
@Controller('admin/offers')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
export class AdminOfferController {
  constructor(private readonly offerService: OfferService) {}

  @Get()
  @ApiOperation({ summary: 'List all offers (admin)' })
  @ApiResponse({ status: 200 })
  async listOffers(
    @Query() query: OfferQueryDto,
  ): Promise<PaginatedResult<Offer>> {
    return this.offerService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get offer detail by ID (admin)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  async getOffer(@Param('id', ParseUUIDPipe) id: string): Promise<Offer> {
    return this.offerService.findOne(id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve an offer' })
  @ApiResponse({ status: 200 })
  async approveOffer(
    @CurrentUser() admin: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Offer> {
    return this.offerService.approve(id, admin.sub);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject an offer' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Rejection reason is required' })
  async rejectOffer(
    @CurrentUser() admin: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectActionDto,
  ): Promise<Offer> {
    return this.offerService.reject(id, admin.sub, dto.reason);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive an offer' })
  @ApiResponse({ status: 200 })
  async archiveOffer(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Offer> {
    return this.offerService.archive(id);
  }
}
