export const OFFERS_INDEX_NAME = 'offers';
export const OFFERS_INDEX_ALIAS = 'offers_active';

export const OFFERS_INDEX_SETTINGS = {
  number_of_shards: 1,
  number_of_replicas: 0,
  analysis: {
    analyzer: {
      product_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'asciifolding', 'product_stemmer'],
      },
      autocomplete_analyzer: {
        type: 'custom',
        tokenizer: 'autocomplete_tokenizer',
        filter: ['lowercase', 'asciifolding'],
      },
      autocomplete_search_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'asciifolding'],
      },
    },
    tokenizer: {
      autocomplete_tokenizer: {
        type: 'edge_ngram',
        min_gram: 2,
        max_gram: 15,
        token_chars: ['letter', 'digit'],
      },
    },
    filter: {
      product_stemmer: {
        type: 'stemmer',
        language: 'english',
      },
    },
  },
};

export const OFFERS_INDEX_MAPPINGS = {
  properties: {
    offer_id: { type: 'keyword' },
    offer_type: { type: 'keyword' },
    offer_status: { type: 'keyword' },
    country_code: { type: 'keyword' },
    price_amount: { type: 'integer' },
    price_currency: { type: 'keyword' },
    compare_at_price: { type: 'integer' },
    stock_quantity: { type: 'integer' },
    in_stock: { type: 'boolean' },
    is_featured: { type: 'boolean' },
    fulfillment_type: { type: 'keyword' },
    vendor_id: { type: 'keyword' },

    product_id: { type: 'keyword' },
    product_name: {
      type: 'text',
      analyzer: 'product_analyzer',
      fields: {
        keyword: { type: 'keyword' },
        autocomplete: {
          type: 'text',
          analyzer: 'autocomplete_analyzer',
          search_analyzer: 'autocomplete_search_analyzer',
        },
      },
    },
    product_slug: { type: 'keyword' },
    description: { type: 'text', analyzer: 'product_analyzer' },
    short_description: { type: 'text', analyzer: 'product_analyzer' },
    country_of_origin: { type: 'keyword' },

    category_id: { type: 'keyword' },
    category_name: { type: 'keyword' },
    category_slug: { type: 'keyword' },

    brand_id: { type: 'keyword' },
    brand_name: { type: 'keyword' },
    brand_slug: { type: 'keyword' },

    variant_id: { type: 'keyword' },
    variant_name: { type: 'keyword' },
    sku: { type: 'keyword' },

    image_url: { type: 'keyword', index: false },

    attributes: {
      type: 'nested',
      properties: {
        name: { type: 'keyword' },
        value: { type: 'keyword' },
      },
    },

    indexed_at: { type: 'date' },
    created_at: { type: 'date' },
  },
};
