import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@common/decorators';
import { PaginatedResult } from '@ecommerce/shared-types';
import { StorefrontService } from '../services/storefront.service';
import { RecommendationService } from '../services/recommendation.service';
import {
  StorefrontQueryDto,
  StorefrontListingDto,
  StorefrontProductDetailDto,
  RecommendationQueryDto,
} from '../dto';

@ApiTags('Storefront')
@Controller('storefront/listings')
export class StorefrontController {
  constructor(
    private readonly storefrontService: StorefrontService,
    private readonly recommendationService: RecommendationService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active offers enriched with product data' })
  @ApiResponse({ status: 200 })
  async listListings(
    @Query() query: StorefrontQueryDto,
  ): Promise<PaginatedResult<StorefrontListingDto>> {
    return this.storefrontService.findListings(query);
  }

  @Public()
  @Get(':slug/recommendations')
  @ApiOperation({ summary: 'Get related product recommendations for a product' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getRecommendations(
    @Param('slug') slug: string,
    @Query() query: RecommendationQueryDto,
  ): Promise<{ recommendations: StorefrontListingDto[] }> {
    const recommendations = await this.recommendationService.getRecommendations(
      slug,
      query.limit,
      query.countryCode,
    );
    return { recommendations };
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get product detail with all active offers' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductDetail(@Param('slug') slug: string): Promise<StorefrontProductDetailDto> {
    return this.storefrontService.findProductDetail(slug);
  }
}

