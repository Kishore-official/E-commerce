import { Test, TestingModule } from '@nestjs/testing';
import { DomainEvent } from '@common/events/domain-event.base';
import { SearchIndexListener } from '../listeners/search-index.listener';
import { SearchIndexingService } from '../services/search-indexing.service';

describe('SearchIndexListener', () => {
  let listener: SearchIndexListener;
  const mockIndexing = {
    indexAllOffersForProduct: jest.fn(),
    removeAllOffersForProduct: jest.fn(),
    indexOffer: jest.fn(),
    removeOffer: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchIndexListener,
        {
          provide: SearchIndexingService,
          useValue: mockIndexing,
        },
      ],
    }).compile();

    listener = module.get(SearchIndexListener);
  });

  const makeEvent = (name: string, id: string): DomainEvent =>
    ({
      eventName: name,
      aggregateId: id,
      payload: {},
      occurredAt: new Date(),
    }) as DomainEvent;

  it('should call indexAllOffersForProduct on product approved', async () => {
    await listener.onProductApproved(
      makeEvent('catalog.product.approved', 'prod-1'),
    );

    expect(mockIndexing.indexAllOffersForProduct).toHaveBeenCalledWith('prod-1');
  });

  it('should call removeAllOffersForProduct on product rejected', async () => {
    await listener.onProductRejected(
      makeEvent('catalog.product.rejected', 'prod-1'),
    );

    expect(mockIndexing.removeAllOffersForProduct).toHaveBeenCalledWith('prod-1');
  });

  it('should call indexOffer on offer activated', async () => {
    await listener.onOfferActivated(
      makeEvent('offers.offer.activated', 'offer-1'),
    );

    expect(mockIndexing.indexOffer).toHaveBeenCalledWith('offer-1');
  });

  it('should call removeOffer on offer stock depleted', async () => {
    await listener.onOfferStockDepleted(
      makeEvent('offers.offer.stock_depleted', 'offer-1'),
    );

    expect(mockIndexing.removeOffer).toHaveBeenCalledWith('offer-1');
  });

  it('should call removeOffer on offer paused', async () => {
    await listener.onOfferPaused(
      makeEvent('offers.offer.paused', 'offer-1'),
    );

    expect(mockIndexing.removeOffer).toHaveBeenCalledWith('offer-1');
  });

  it('should call removeOffer on offer archived', async () => {
    await listener.onOfferArchived(
      makeEvent('offers.offer.archived', 'offer-1'),
    );

    expect(mockIndexing.removeOffer).toHaveBeenCalledWith('offer-1');
  });

  it('should not throw when indexing fails', async () => {
    mockIndexing.indexOffer.mockRejectedValue(new Error('OpenSearch down'));

    await expect(
      listener.onOfferActivated(makeEvent('offers.offer.activated', 'offer-1')),
    ).resolves.not.toThrow();
  });
});
