import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  CarrierProviderPort,
  CreateShipmentRequest,
  CreateShipmentResponse,
  TrackingInfo,
  CarrierWebhookPayload,
  ParsedCarrierEvent,
} from '../ports/carrier-provider.port';

@Injectable()
export class MockCarrierProvider implements CarrierProviderPort {
  private readonly logger = new Logger(MockCarrierProvider.name);

  async createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResponse> {
    this.logger.log(`[Mock] Creating shipment for order ${request.orderId}`);
    const trackingNumber = `MOCK-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
    return {
      trackingNumber,
      carrier: request.carrier || 'mock-carrier',
      shippingLabelUrl: `https://mock-labels.example.com/${trackingNumber}.pdf`,
      estimatedDeliveryAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  }

  async getTrackingInfo(trackingNumber: string, carrier: string): Promise<TrackingInfo> {
    this.logger.log(`[Mock] Getting tracking info for ${trackingNumber}`);
    return {
      trackingNumber,
      carrier,
      status: 'in_transit',
      events: [
        {
          status: 'shipped',
          description: 'Package picked up',
          location: 'Warehouse',
          occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          status: 'in_transit',
          description: 'In transit to destination',
          location: 'Sorting facility',
          occurredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      ],
      estimatedDeliveryAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    };
  }

  parseWebhook(payload: CarrierWebhookPayload): ParsedCarrierEvent {
    const body = payload.body;
    return {
      trackingNumber: body['trackingNumber'] as string,
      carrier: body['carrier'] as string,
      status: body['status'] as string,
      description: (body['description'] as string) || '',
      location: body['location'] as string | undefined,
      occurredAt: new Date((body['occurredAt'] as string) || Date.now()),
      rawPayload: body,
    };
  }

  verifyWebhookSignature(_payload: CarrierWebhookPayload): boolean {
    return true;
  }
}
