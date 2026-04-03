import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaginatedResult } from '@ecommerce/shared-types';
import { Public } from '@common/decorators';
import { OfferService } from '../services/offer.service';
import { Offer } from '../schemas/offer.schema';
import { OfferQueryDto } from '../dto';

@ApiTags('Offers')
@Controller('offers')
export class PublicOfferController {
  constructor(private readonly offerService: OfferService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active offers' })
  @ApiResponse({ status: 200 })
  async listOffers(
    @Query() query: OfferQueryDto,
  ): Promise<PaginatedResult<Offer>> {
    return this.offerService.findActive(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get offer detail' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  async getOffer(@Param('id', ParseUUIDPipe) id: string): Promise<Offer> {
    return this.offerService.findById(id);
  }
}
