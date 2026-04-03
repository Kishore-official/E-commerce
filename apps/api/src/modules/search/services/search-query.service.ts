import { Injectable, Logger } from '@nestjs/common';
import { OpenSearchService } from './opensearch.service';
import { OFFERS_INDEX_ALIAS } from '../constants/index-mapping';
import { SearchQueryParams } from '../interfaces/search-query.interface';
import {
  SearchResult,
  SearchHit,
  SearchFacets,
  SuggestResult,
  SuggestionItem,
} from '../interfaces/search-result.interface';

@Injectable()
export class SearchQueryService {
  private readonly logger = new Logger(SearchQueryService.name);

  constructor(private readonly opensearch: OpenSearchService) {}

  async search(params: SearchQueryParams): Promise<SearchResult> {
    const { from, size } = this.paginate(params.page, params.limit);
    const query = this.buildQuery(params);
    const sort = this.buildSort(params.sortBy, !!params.q);
    const aggs = this.buildAggregations();

    const body: Record<string, any> = {
      from,
      size,
      query,
      sort,
      aggs,
    };

    if (params.q) {
      body.highlight = {
        fields: {
          product_name: { pre_tags: ['<em>'], post_tags: ['</em>'] },
          description: {
            pre_tags: ['<em>'],
            post_tags: ['</em>'],
            fragment_size: 150,
          },
        },
      };
    }

    const result = await this.opensearch.search({
      index: OFFERS_INDEX_ALIAS,
      body,
    });

    return this.mapResponse(result, params.page, params.limit);
  }

  async suggest(query: string, limit = 5): Promise<SuggestResult> {
    const body = {
      size: limit,
      query: {
        multi_match: {
          query,
          fields: ['product_name.autocomplete^2', 'product_name'],
          type: 'bool_prefix',
        },
      },
      _source: [
        'product_id',
        'product_name',
        'product_slug',
        'image_url',
        'price_amount',
        'price_currency',
      ],
      collapse: { field: 'product_id' },
    };

    const result = await this.opensearch.search({
      index: OFFERS_INDEX_ALIAS,
      body,
    });

    const suggestions: SuggestionItem[] = (result.hits?.hits ?? []).map(
      (hit: any) => ({
        text: hit._source.product_name,
        productId: hit._source.product_id,
        productSlug: hit._source.product_slug,
        imageUrl: hit._source.image_url,
        priceAmount: hit._source.price_amount,
        priceCurrency: hit._source.price_currency,
      }),
    );

    return { suggestions };
  }

  private buildQuery(params: SearchQueryParams): Record<string, any> {
    const must: any[] = [];
    const filter: any[] = [];

    if (params.q) {
      must.push({
        multi_match: {
          query: params.q,
          fields: [
            'product_name^3',
            'description',
            'short_description',
            'brand_name^2',
            'category_name',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    if (params.categoryId) {
      filter.push({ term: { category_id: params.categoryId } });
    }
    if (params.brandId) {
      filter.push({ term: { brand_id: params.brandId } });
    }
    if (params.countryCode) {
      filter.push({ term: { country_code: params.countryCode } });
    }
    if (params.offerType) {
      filter.push({ term: { offer_type: params.offerType } });
    }
    if (params.inStock !== undefined) {
      filter.push({ term: { in_stock: params.inStock } });
    }
    if (params.isFeatured !== undefined) {
      filter.push({ term: { is_featured: params.isFeatured } });
    }
    if (params.priceMin !== undefined || params.priceMax !== undefined) {
      const range: any = {};
      if (params.priceMin !== undefined) range.gte = params.priceMin;
      if (params.priceMax !== undefined) range.lte = params.priceMax;
      filter.push({ range: { price_amount: range } });
    }

    // Defense in depth: always filter to active only
    filter.push({ term: { offer_status: 'active' } });

    return {
      bool: {
        must: must.length > 0 ? must : [{ match_all: {} }],
        filter,
      },
    };
  }

  private buildSort(
    sortBy: string | undefined,
    hasQuery: boolean,
  ): any[] {
    switch (sortBy) {
      case 'price_asc':
        return [{ price_amount: 'asc' }, '_score'];
      case 'price_desc':
        return [{ price_amount: 'desc' }, '_score'];
      case 'newest':
        return [{ created_at: 'desc' }, '_score'];
      case 'relevance':
      default:
        return hasQuery
          ? ['_score', { created_at: 'desc' }]
          : [{ created_at: 'desc' }];
    }
  }

  private buildAggregations(): Record<string, any> {
    return {
      categories: {
        terms: { field: 'category_name', size: 50 },
      },
      brands: {
        terms: { field: 'brand_name', size: 50 },
      },
      countries: {
        terms: { field: 'country_code', size: 20 },
      },
      offer_types: {
        terms: { field: 'offer_type', size: 5 },
      },
      price_ranges: {
        range: {
          field: 'price_amount',
          ranges: [
            { to: 5000 },
            { from: 5000, to: 10000 },
            { from: 10000, to: 25000 },
            { from: 25000, to: 50000 },
            { from: 50000, to: 100000 },
            { from: 100000 },
          ],
        },
      },
    };
  }

  private paginate(
    page: number,
    limit: number,
  ): { from: number; size: number } {
    return { from: (page - 1) * limit, size: limit };
  }

  private mapResponse(
    result: any,
    page: number,
    limit: number,
  ): SearchResult {
    const total = result.hits?.total?.value ?? 0;
    const took = result.took ?? 0;

    const hits: SearchHit[] = (result.hits?.hits ?? []).map((hit: any) => ({
      document: hit._source,
      score: hit._score,
      highlights: hit.highlight,
    }));

    const aggs = result.aggregations ?? {};

    const facets: SearchFacets = {
      categories: (aggs.categories?.buckets ?? []).map((b: any) => ({
        key: b.key,
        label: b.key,
        count: b.doc_count,
      })),
      brands: (aggs.brands?.buckets ?? []).map((b: any) => ({
        key: b.key,
        label: b.key,
        count: b.doc_count,
      })),
      countries: (aggs.countries?.buckets ?? []).map((b: any) => ({
        key: b.key,
        label: b.key,
        count: b.doc_count,
      })),
      offerTypes: (aggs.offer_types?.buckets ?? []).map((b: any) => ({
        key: b.key,
        label: b.key,
        count: b.doc_count,
      })),
      priceRanges: (aggs.price_ranges?.buckets ?? []).map((b: any) => ({
        from: b.from ?? 0,
        to: b.to ?? null,
        count: b.doc_count,
      })),
    };

    return {
      hits,
      facets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      took,
    };
  }
}
