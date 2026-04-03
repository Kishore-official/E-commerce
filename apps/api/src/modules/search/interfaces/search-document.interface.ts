export interface OfferSearchDocument {
  offer_id: string;
  offer_type: string;
  offer_status: string;
  country_code: string;
  price_amount: number;
  price_currency: string;
  compare_at_price: number | null;
  stock_quantity: number;
  in_stock: boolean;
  is_featured: boolean;
  fulfillment_type: string;
  vendor_id: string;

  product_id: string;
  product_name: string;
  product_slug: string;
  description: string | null;
  short_description: string | null;
  country_of_origin: string | null;

  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;

  brand_id: string | null;
  brand_name: string | null;
  brand_slug: string | null;

  variant_id: string;
  variant_name: string;
  sku: string;

  image_url: string | null;

  attributes: { name: string; value: string }[];

  indexed_at: string;
  created_at: string;
}
