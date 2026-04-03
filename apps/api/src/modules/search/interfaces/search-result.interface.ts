import { OfferSearchDocument } from './search-document.interface';

export interface SearchHit {
  document: OfferSearchDocument;
  score: number;
  highlights?: Record<string, string[]>;
}

export interface FacetBucket {
  key: string;
  label: string;
  count: number;
}

export interface PriceRangeBucket {
  from: number;
  to: number | null;
  count: number;
}

export interface SearchFacets {
  categories: FacetBucket[];
  brands: FacetBucket[];
  countries: FacetBucket[];
  offerTypes: FacetBucket[];
  priceRanges: PriceRangeBucket[];
}

export interface SearchResult {
  hits: SearchHit[];
  facets: SearchFacets;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  took: number;
}

export interface SuggestionItem {
  text: string;
  productId: string;
  productSlug: string;
  imageUrl: string | null;
  priceAmount: number;
  priceCurrency: string;
}

export interface SuggestResult {
  suggestions: SuggestionItem[];
}
