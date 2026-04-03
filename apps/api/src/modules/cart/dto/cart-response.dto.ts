export class CartItemResponseDto {
  id: string;
  offerId: string;
  quantity: number;
  priceSnapshot: number;
  currency: string;
  productName: string;
  variantName: string;
  productSlug: string;
  imageUrl: string | null;
}

export class CartResponseDto {
  id: string;
  userId: string | null;
  sessionId: string | null;
  countryCode: string;
  status: string;
  items: CartItemResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}
