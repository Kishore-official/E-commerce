import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenSearchService } from '../services/opensearch.service';

const mockIndices = {
  exists: jest.fn(),
  create: jest.fn(),
  putAlias: jest.fn(),
  getAlias: jest.fn(),
  updateAliases: jest.fn(),
  delete: jest.fn(),
  refresh: jest.fn(),
};

const mockClient = {
  ping: jest.fn(),
  indices: mockIndices,
  index: jest.fn(),
  delete: jest.fn(),
  bulk: jest.fn(),
  search: jest.fn(),
};

jest.mock('@opensearch-project/opensearch', () => ({
  Client: jest.fn().mockImplementation(() => mockClient),
}));

describe('OpenSearchService', () => {
  let service: OpenSearchService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenSearchService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                'opensearch.node': 'http://localhost:9200',
                'opensearch.username': 'admin',
                'opensearch.password': 'admin',
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OpenSearchService>(OpenSearchService);
  });

  describe('onModuleInit', () => {
    it('should connect successfully and create index', async () => {
      mockClient.ping.mockResolvedValue({ body: true });
      mockIndices.exists.mockResolvedValue({ body: false });
      mockIndices.create.mockResolvedValue({});
      mockIndices.putAlias.mockResolvedValue({});

      await service.onModuleInit();

      expect(service.isAvailable()).toBe(true);
      expect(mockIndices.create).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'offers_v1' }),
      );
    });

    it('should skip index creation if already exists', async () => {
      mockClient.ping.mockResolvedValue({ body: true });
      mockIndices.exists.mockResolvedValue({ body: true });

      await service.onModuleInit();

      expect(service.isAvailable()).toBe(true);
      expect(mockIndices.create).not.toHaveBeenCalled();
    });

    it('should set available=false on connection failure', async () => {
      mockClient.ping.mockRejectedValue(new Error('ECONNREFUSED'));

      await service.onModuleInit();

      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('indexDocument', () => {
    it('should index when available', async () => {
      mockClient.ping.mockResolvedValue({ body: true });
      mockIndices.exists.mockResolvedValue({ body: true });
      mockClient.index.mockResolvedValue({});

      await service.onModuleInit();
      await service.indexDocument({ offer_id: 'o1' } as any);

      expect(mockClient.index).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'o1' }),
      );
    });

    it('should skip when unavailable', async () => {
      mockClient.ping.mockRejectedValue(new Error('down'));
      await service.onModuleInit();

      await service.indexDocument({ offer_id: 'o1' } as any);

      expect(mockClient.index).not.toHaveBeenCalled();
    });
  });

  describe('deleteDocument', () => {
    it('should delete when available', async () => {
      mockClient.ping.mockResolvedValue({ body: true });
      mockIndices.exists.mockResolvedValue({ body: true });
      mockClient.delete.mockResolvedValue({});

      await service.onModuleInit();
      await service.deleteDocument('o1');

      expect(mockClient.delete).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'o1' }),
      );
    });

    it('should ignore 404 on delete', async () => {
      mockClient.ping.mockResolvedValue({ body: true });
      mockIndices.exists.mockResolvedValue({ body: true });
      mockClient.delete.mockRejectedValue({ statusCode: 404 });

      await service.onModuleInit();
      await expect(service.deleteDocument('o1')).resolves.not.toThrow();
    });
  });

  describe('bulkIndex', () => {
    it('should return indexed/error counts', async () => {
      mockClient.ping.mockResolvedValue({ body: true });
      mockIndices.exists.mockResolvedValue({ body: true });
      mockClient.bulk.mockResolvedValue({
        body: {
          items: [
            { index: {} },
            { index: { error: 'mapping_err' } },
            { index: {} },
          ],
        },
      });

      await service.onModuleInit();
      const result = await service.bulkIndex([
        { offer_id: '1' } as any,
        { offer_id: '2' } as any,
        { offer_id: '3' } as any,
      ]);

      expect(result).toEqual({ indexed: 2, errors: 1 });
    });

    it('should return zeros when unavailable', async () => {
      mockClient.ping.mockRejectedValue(new Error('down'));
      await service.onModuleInit();

      const result = await service.bulkIndex([{ offer_id: '1' } as any]);
      expect(result).toEqual({ indexed: 0, errors: 0 });
    });
  });

  describe('search', () => {
    it('should throw when unavailable', async () => {
      mockClient.ping.mockRejectedValue(new Error('down'));
      await service.onModuleInit();

      await expect(
        service.search({ index: 'test', body: {} }),
      ).rejects.toThrow('OpenSearch is not available');
    });

    it('should return results when available', async () => {
      mockClient.ping.mockResolvedValue({ body: true });
      mockIndices.exists.mockResolvedValue({ body: true });
      mockClient.search.mockResolvedValue({
        body: { hits: { hits: [], total: { value: 0 } } },
      });

      await service.onModuleInit();
      const result = await service.search({
        index: 'offers_active',
        body: {},
      });

      expect(result).toBeDefined();
    });
  });
});
