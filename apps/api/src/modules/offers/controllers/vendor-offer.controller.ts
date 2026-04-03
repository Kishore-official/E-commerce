import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
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
import { ActiveVendorGuard } from '@common/guards/active-vendor.guard';
import { OfferService } from '../services/offer.service';
import { Offer } from '../schemas/offer.schema';
import { CreateOfferDto, UpdateOfferDto, UpdateStockDto, OfferQueryDto } from '../dto';

@ApiTags('Vendor - Offers')
@ApiBearerAuth()
@Controller('vendor/offers')
@Roles(UserRole.VENDOR, UserRole.VENDOR_STAFF)
@UseGuards(ActiveVendorGuard)
export class VendorOfferController {
  constructor(private readonly offerService: OfferService) {}

  @Post()
  @ApiOperation({ summary: 'Create offer' })
  @ApiResponse({ status: 201, description: 'Offer created' })
  async createOffer(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOfferDto,
  ): Promise<Offer> {
    return this.offerService.create(user.vendorId!, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List own offers' })
  @ApiResponse({ status: 200 })
  async listOffers(
    @CurrentUser() user: JwtPayload,
    @Query() query: OfferQueryDto,
  ): Promise<PaginatedResult<Offer>> {
    return this.offerService.findByVendor(user.vendorId!, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single offer detail (own)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  async getOffer(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Offer> {
    return this.offerService.findOneByVendor(id, user.vendorId!);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update offer' })
  @ApiResponse({ status: 200 })
  async updateOffer(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfferDto,
  ): Promise<Offer> {
    return this.offerService.update(id, user.vendorId!, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit offer for review' })
  @ApiResponse({ status: 200 })
  async submitForReview(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Offer> {
    return this.offerService.submitForReview(id, user.vendorId!);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivate paused offer (no re-approval needed)' })
  @ApiResponse({ status: 200 })
  async activateOffer(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Offer> {
    return this.offerService.activate(id, user.vendorId!);
  }

  @Patch(':id/pause')
  @ApiOperation({ summary: 'Pause offer' })
  @ApiResponse({ status: 200 })
  async pauseOffer(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Offer> {
    return this.offerService.pause(id, user.vendorId!);
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: 'Update stock quantity' })
  @ApiResponse({ status: 200 })
  async updateStock(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockDto,
  ): Promise<Offer> {
    return this.offerService.updateStock(id, user.vendorId!, dto);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive own offer' })
  @ApiResponse({ status: 200 })
  async archiveOffer(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Offer> {
    return this.offerService.archiveByVendor(id, user.vendorId!);
  }

  @Patch(':id/unarchive')
  @ApiOperation({ summary: 'Unarchive offer back to draft' })
  @ApiResponse({ status: 200 })
  async unarchiveOffer(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Offer> {
    return this.offerService.unarchiveByVendor(id, user.vendorId!);
  }
}
