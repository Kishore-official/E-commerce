export class ReviewEligibilityDto {
  id: string;
  orderId: string;
  orderItemId: string;
  userId: string;
  productId: string;
  variantId: string | null;
  status: string;
  eligibleUntil: Date;
  createdAt: Date;
  productName: string;
  variantName: string;
  productSlug: string;
}
