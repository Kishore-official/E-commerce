import { Injectable, Logger } from '@nestjs/common';
import { OpenSearchService } from './opensearch.service';
import { SearchIndexingService } from './search-indexing.service';

export interface ReindexResult {
  totalIndexed: number;
  totalErrors: number;
  durationMs: number;
  newIndexName: string;
}

@Injectable()
export class SearchReindexService {
  private readonly logger = new Logger(SearchReindexService.name);
  private reindexInProgress = false;

  constructor(
    private readonly opensearch: OpenSearchService,
    private readonly indexing: SearchIndexingService,
  ) {}

  isReindexing(): boolean {
    return this.reindexInProgress;
  }

  async fullReindex(): Promise<ReindexResult> {
    if (this.reindexInProgress) {
      throw new Error('Reindex already in progress');
    }

    this.reindexInProgress = true;
    const start = Date.now();
    let totalIndexed = 0;
    let totalErrors = 0;

    try {
      const version = `v${Date.now()}`;
      const newIndex = await this.opensearch.createVersionedIndex(version);
      this.logger.log(`Full reindex started -- new index: ${newIndex}`);

      const client = this.opensearch.getClient();
      if (!client) throw new Error('OpenSearch client not available');

      for await (const batch of this.indexing.loadAllIndexableOffers(200)) {
        const body: any[] = [];
        for (const doc of batch) {
          body.push({ index: { _index: newIndex, _id: doc.offer_id } });
          body.push(doc);
        }

        const { body: result } = await client.bulk({ body, refresh: false });
        const errors = result.items.filter(
          (item: any) => item.index?.error,
        ).length;
        totalIndexed += batch.length - errors;
        totalErrors += errors;

        if (errors > 0) {
          this.logger.warn(`Batch had ${errors} indexing errors`);
        }
      }

      await client.indices.refresh({ index: newIndex });
      await this.opensearch.swapAlias(newIndex);

      const durationMs = Date.now() - start;
      this.logger.log(
        `Full reindex complete: ${totalIndexed} docs, ${totalErrors} errors, ${durationMs}ms`,
      );

      return { totalIndexed, totalErrors, durationMs, newIndexName: newIndex };
    } finally {
      this.reindexInProgress = false;
    }
  }
}
