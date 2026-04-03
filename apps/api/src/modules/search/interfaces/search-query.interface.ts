export interface SearchQueryParams {
  q?: string;
  categoryId?: string;
  brandId?: string;
  countryCode?: string;
  priceMin?: number;
  priceMax?: number;
  offerType?: string;
  inStock?: boolean;
  isFeatured?: boolean;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
  page: number;
  limit: number;
}
