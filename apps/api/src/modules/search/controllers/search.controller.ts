import {
  Controller,
  Get,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@common/decorators';
import { SearchQueryService } from '../services/search-query.service';
import { OpenSearchService } from '../services/opensearch.service';
import { SearchProductsDto, SearchSuggestDto } from '../dto';
import {
  SearchResult,
  SuggestResult,
} from '../interfaces/search-result.interface';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(
    private readonly queryService: SearchQueryService,
    private readonly opensearch: OpenSearchService,
  ) {}

  @Public()
  @Get('products')
  @ApiOperation({ summary: 'Search products with facets and filters' })
  @ApiResponse({ status: 200, description: 'Search results with facets' })
  @ApiResponse({ status: 503, description: 'Search unavailable' })
  async searchProducts(
    @Query() dto: SearchProductsDto,
  ): Promise<SearchResult> {
    this.assertAvailable();
    return this.queryService.search({
      q: dto.q,
      categoryId: dto.categoryId,
      brandId: dto.brandId,
      countryCode: dto.countryCode,
      priceMin: dto.priceMin,
      priceMax: dto.priceMax,
      offerType: dto.offerType,
      inStock: dto.inStock,
      isFeatured: dto.isFeatured,
      sortBy: dto.sortBy,
      page: dto.page,
      limit: dto.limit,
    });
  }

  @Public()
  @Get('suggest')
  @ApiOperation({ summary: 'Autocomplete search suggestions' })
  @ApiResponse({ status: 200, description: 'Autocomplete suggestions' })
  @ApiResponse({ status: 503, description: 'Search unavailable' })
  async suggest(@Query() dto: SearchSuggestDto): Promise<SuggestResult> {
    this.assertAvailable();
    return this.queryService.suggest(dto.q, dto.limit);
  }

  private assertAvailable(): void {
    if (!this.opensearch.isAvailable()) {
      throw new ServiceUnavailableException(
        'Search is temporarily unavailable',
      );
    }
  }
}
