export interface CreateShipmentRequest {
  orderId: string;
  vendorId: string;
  items: Array<{
    orderItemId: string;
    quantity: number;
    sku: string;
    description: string;
    weight?: number;
  }>;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    countryCode: string;
    phone?: string;
  };
  carrier?: string;
}

export interface CreateShipmentResponse {
  trackingNumber: string;
  carrier: string;
  shippingLabelUrl?: string;
  estimatedDeliveryAt?: Date;
}

export interface TrackingInfo {
  trackingNumber: string;
  carrier: string;
  status: string;
  events: Array<{
    status: string;
    description: string;
    location?: string;
    occurredAt: Date;
  }>;
  estimatedDeliveryAt?: Date;
}

export interface CarrierWebhookPayload {
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

export interface ParsedCarrierEvent {
  trackingNumber: string;
  carrier: string;
  status: string;
  description: string;
  location?: string;
  occurredAt: Date;
  rawPayload: Record<string, unknown>;
}

export const CARRIER_PROVIDER_PORT = 'CARRIER_PROVIDER_PORT';

export interface CarrierProviderPort {
  createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResponse>;
  getTrackingInfo(trackingNumber: string, carrier: string): Promise<TrackingInfo>;
  parseWebhook(payload: CarrierWebhookPayload): ParsedCarrierEvent;
  verifyWebhookSignature(payload: CarrierWebhookPayload): boolean;
}
