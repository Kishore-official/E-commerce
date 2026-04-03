import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvent } from '@common/events/domain-event.base';
import { SearchIndexingService } from '../services/search-indexing.service';

@Injectable()
export class SearchIndexListener {
  private readonly logger = new Logger(SearchIndexListener.name);

  constructor(private readonly indexing: SearchIndexingService) {}

  @OnEvent('catalog.product.approved')
  async onProductApproved(event: DomainEvent): Promise<void> {
    this.logger.debug(`Product approved: ${event.aggregateId}`);
    try {
      await this.indexing.indexAllOffersForProduct(event.aggregateId);
    } catch (error) {
      this.logger.warn(`Failed to index offers for product ${event.aggregateId}: ${error}`);
    }
  }

  @OnEvent('catalog.product.rejected')
  async onProductRejected(event: DomainEvent): Promise<void> {
    this.logger.debug(`Product rejected: ${event.aggregateId}`);
    try {
      await this.indexing.removeAllOffersForProduct(event.aggregateId);
    } catch (error) {
      this.logger.warn(`Failed to remove offers for product ${event.aggregateId}: ${error}`);
    }
  }

  @OnEvent('offers.offer.activated')
  async onOfferActivated(event: DomainEvent): Promise<void> {
    this.logger.debug(`Offer activated: ${event.aggregateId}`);
    try {
      await this.indexing.indexOffer(event.aggregateId);
    } catch (error) {
      this.logger.warn(`Failed to index offer ${event.aggregateId}: ${error}`);
    }
  }

  @OnEvent('offers.offer.stock_depleted')
  async onOfferStockDepleted(event: DomainEvent): Promise<void> {
    this.logger.debug(`Offer stock depleted: ${event.aggregateId}`);
    try {
      await this.indexing.removeOffer(event.aggregateId);
    } catch (error) {
      this.logger.warn(`Failed to remove offer ${event.aggregateId}: ${error}`);
    }
  }

  @OnEvent('offers.offer.paused')
  async onOfferPaused(event: DomainEvent): Promise<void> {
    this.logger.debug(`Offer paused: ${event.aggregateId}`);
    try {
      await this.indexing.removeOffer(event.aggregateId);
    } catch (error) {
      this.logger.warn(`Failed to remove offer ${event.aggregateId}: ${error}`);
    }
  }

  @OnEvent('catalog.product.archived')
  async onProductArchived(event: DomainEvent): Promise<void> {
    this.logger.debug(`Product archived: ${event.aggregateId}`);
    try {
      await this.indexing.removeAllOffersForProduct(event.aggregateId);
    } catch (error) {
      this.logger.warn(`Failed to remove offers for archived product ${event.aggregateId}: ${error}`);
    }
  }

  @OnEvent('offers.offer.archived')
  async onOfferArchived(event: DomainEvent): Promise<void> {
    this.logger.debug(`Offer archived: ${event.aggregateId}`);
    try {
      await this.indexing.removeOffer(event.aggregateId);
    } catch (error) {
      this.logger.warn(`Failed to remove offer ${event.aggregateId}: ${error}`);
    }
  }
}
