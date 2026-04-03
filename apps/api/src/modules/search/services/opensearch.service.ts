import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';
import {
  OFFERS_INDEX_NAME,
  OFFERS_INDEX_ALIAS,
  OFFERS_INDEX_SETTINGS,
  OFFERS_INDEX_MAPPINGS,
} from '../constants/index-mapping';
import { OfferSearchDocument } from '../interfaces/search-document.interface';

@Injectable()
export class OpenSearchService implements OnModuleInit {
  private readonly logger = new Logger(OpenSearchService.name);
  private client: Client | null = null;
  private available = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      this.client = new Client({
        node: this.config.get<string>('opensearch.node'),
        auth: {
          username: this.config.get<string>('opensearch.username') || 'admin',
          password: this.config.get<string>('opensearch.password') || 'admin',
        },
        ssl: { rejectUnauthorized: false },
      });
      await this.client.ping();
      this.available = true;
      this.logger.log('OpenSearch connected successfully');
      await this.ensureIndex();
    } catch (err: any) {
      this.available = false;
      this.logger.warn(
        `OpenSearch unavailable -- search indexing disabled. ${err.message}`,
      );
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  getClient(): Client | null {
    return this.client;
  }

  async ensureIndex(): Promise<void> {
    if (!this.client) return;
    const indexName = `${OFFERS_INDEX_NAME}_v1`;
    const { body: exists } = await this.client.indices.exists({ index: indexName });
    if (!exists) {
      await this.client.indices.create({
        index: indexName,
        body: {
          settings: OFFERS_INDEX_SETTINGS,
          mappings: OFFERS_INDEX_MAPPINGS,
        },
      });
      await this.client.indices.putAlias({
        index: indexName,
        name: OFFERS_INDEX_ALIAS,
      });
      this.logger.log(
        `Created index '${indexName}' with alias '${OFFERS_INDEX_ALIAS}'`,
      );
    }
  }

  async indexDocument(doc: OfferSearchDocument): Promise<void> {
    if (!this.available || !this.client) {
      this.logger.debug('OpenSearch unavailable -- skipping index');
      return;
    }
    await this.client.index({
      index: OFFERS_INDEX_ALIAS,
      id: doc.offer_id,
      body: doc,
      refresh: false,
    });
  }

  async deleteDocument(offerId: string): Promise<void> {
    if (!this.available || !this.client) return;
    try {
      await this.client.delete({
        index: OFFERS_INDEX_ALIAS,
        id: offerId,
        refresh: false,
      });
    } catch (err: any) {
      if (err.statusCode === 404) return;
      throw err;
    }
  }

  async bulkIndex(
    docs: OfferSearchDocument[],
  ): Promise<{ indexed: number; errors: number }> {
    if (!this.available || !this.client || docs.length === 0) {
      return { indexed: 0, errors: 0 };
    }

    const body: any[] = [];
    for (const doc of docs) {
      body.push({ index: { _index: OFFERS_INDEX_ALIAS, _id: doc.offer_id } });
      body.push(doc);
    }

    const { body: result } = await this.client.bulk({ body, refresh: false });
    const errors = result.items.filter(
      (item: any) => item.index?.error,
    ).length;
    return { indexed: docs.length - errors, errors };
  }

  async search(params: {
    index: string;
    body: Record<string, any>;
  }): Promise<any> {
    if (!this.available || !this.client) {
      throw new Error('OpenSearch is not available');
    }
    const { body } = await this.client.search(params);
    return body;
  }

  async createVersionedIndex(version: string): Promise<string> {
    if (!this.client) throw new Error('OpenSearch unavailable');
    const indexName = `${OFFERS_INDEX_NAME}_${version}`;
    await this.client.indices.create({
      index: indexName,
      body: {
        settings: OFFERS_INDEX_SETTINGS,
        mappings: OFFERS_INDEX_MAPPINGS,
      },
    });
    return indexName;
  }

  async swapAlias(newIndex: string): Promise<void> {
    if (!this.client) return;
    try {
      const { body: aliasInfo } = await this.client.indices.getAlias({
        name: OFFERS_INDEX_ALIAS,
      });
      const oldIndices = Object.keys(aliasInfo);

      const actions: any[] = [];
      for (const old of oldIndices) {
        actions.push({ remove: { index: old, alias: OFFERS_INDEX_ALIAS } });
      }
      actions.push({ add: { index: newIndex, alias: OFFERS_INDEX_ALIAS } });

      await this.client.indices.updateAliases({ body: { actions } });

      for (const old of oldIndices) {
        if (old !== newIndex) {
          await this.client.indices.delete({ index: old });
        }
      }
    } catch {
      await this.client.indices.putAlias({
        index: newIndex,
        name: OFFERS_INDEX_ALIAS,
      });
    }
  }

  async refreshIndex(): Promise<void> {
    if (!this.available || !this.client) return;
    await this.client.indices.refresh({ index: OFFERS_INDEX_ALIAS });
  }
}
