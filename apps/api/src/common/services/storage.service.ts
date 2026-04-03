import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';

export interface UploadResult {
  url: string;
  key: string;
  size: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly provider: 's3' | 'gridfs';
  private bucket: GridFSBucket;
  private s3Client: S3Client | null = null;
  private s3Bucket: string;
  private s3Endpoint: string;
  private cdnUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectConnection() private readonly connection: Connection,
  ) {
    this.provider = this.configService.get<string>('STORAGE_PROVIDER', 'gridfs') as 's3' | 'gridfs';

    // Always init GridFS as fallback
    const db = this.connection.db;
    this.bucket = new GridFSBucket(db as any, { bucketName: 'uploads' });

    if (this.provider === 's3') {
      this.s3Endpoint = this.configService.get<string>('s3.endpoint', 'http://localhost:9000');
      this.s3Bucket = this.configService.get<string>('s3.bucket', 'ecommerce');
      this.cdnUrl = this.configService.get<string>('CDN_URL', '');

      this.s3Client = new S3Client({
        endpoint: this.s3Endpoint,
        region: this.configService.get<string>('s3.region', 'us-east-1'),
        credentials: {
          accessKeyId: this.configService.get<string>('s3.accessKeyId', ''),
          secretAccessKey: this.configService.get<string>('s3.secretAccessKey', ''),
        },
        forcePathStyle: true,
      });
      this.logger.log(`Using S3 storage: ${this.s3Endpoint}/${this.s3Bucket}`);
    } else {
      this.logger.log('Using MongoDB GridFS storage');
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'products',
  ): Promise<UploadResult> {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const key = `${folder}/${fileName}`;

    if (this.provider === 's3' && this.s3Client) {
      return this.uploadToS3(file, key);
    }
    return this.uploadToGridFS(file, key);
  }

  async getFileStream(
    key: string,
  ): Promise<{ stream: Readable; contentType: string }> {
    if (this.provider === 's3' && this.s3Client) {
      return this.getFromS3(key);
    }
    return this.getFromGridFS(key);
  }

  async deleteFile(key: string): Promise<void> {
    if (this.provider === 's3' && this.s3Client) {
      return this.deleteFromS3(key);
    }
    return this.deleteFromGridFS(key);
  }

  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (this.provider !== 's3' || !this.s3Client) {
      // For GridFS, return the API endpoint
      return `/api/v1/files/${key}`;
    }

    const command = new GetObjectCommand({
      Bucket: this.s3Bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client as any, command, { expiresIn });
  }

  getPublicUrl(key: string): string {
    if (this.provider === 's3') {
      if (this.cdnUrl) {
        return `${this.cdnUrl}/${key}`;
      }
      return `${this.s3Endpoint}/${this.s3Bucket}/${key}`;
    }
    return `/api/v1/files/${key}`;
  }

  extractKeyFromUrl(url: string): string | null {
    // Handle S3/CDN URLs
    if (this.cdnUrl && url.startsWith(this.cdnUrl)) {
      return url.replace(`${this.cdnUrl}/`, '');
    }
    // Handle S3 direct URLs
    if (url.includes(this.s3Bucket)) {
      const regex = new RegExp(`${this.s3Bucket}/(.+)$`);
      const match = url.match(regex);
      if (match) return match[1];
    }
    // Handle GridFS URLs
    const regex = /\/files\/(.+)$/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  // ── S3 Methods ─────────────────────────────────────────────

  private async uploadToS3(file: Express.Multer.File, key: string): Promise<UploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.s3Bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        originalName: file.originalname,
      },
    });

    await this.s3Client!.send(command);
    const url = this.getPublicUrl(key);

    this.logger.log(`Uploaded to S3: ${key} (${file.size} bytes)`);
    return { url, key, size: file.size };
  }

  private async getFromS3(key: string): Promise<{ stream: Readable; contentType: string }> {
    const command = new GetObjectCommand({
      Bucket: this.s3Bucket,
      Key: key,
    });

    const response = await this.s3Client!.send(command);
    const stream = response.Body as Readable;
    const contentType = response.ContentType || 'application/octet-stream';

    return { stream, contentType };
  }

  private async deleteFromS3(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
      });
      await this.s3Client!.send(command);
      this.logger.log(`Deleted from S3: ${key}`);
    } catch (error: any) {
      this.logger.warn(`Failed to delete S3 file ${key}: ${error.message}`);
    }
  }

  // ── GridFS Methods (fallback) ──────────────────────────────

  private async uploadToGridFS(file: Express.Multer.File, key: string): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const readableStream = Readable.from(file.buffer);
      const uploadStream = this.bucket.openUploadStream(key, {
        metadata: { contentType: file.mimetype, originalName: file.originalname },
      });

      readableStream
        .pipe(uploadStream)
        .on('error', (error) => {
          this.logger.error(`GridFS upload failed for ${key}: ${error}`);
          reject(error);
        })
        .on('finish', () => {
          const url = `/api/v1/files/${key}`;
          resolve({ url, key, size: file.size });
        });
    });
  }

  private async getFromGridFS(key: string): Promise<{ stream: Readable; contentType: string }> {
    const files = await this.bucket.find({ filename: key }).toArray();
    if (files.length === 0) {
      throw new Error(`File not found: ${key}`);
    }

    const stream = this.bucket.openDownloadStreamByName(key);
    const contentType = files[0].metadata?.contentType || 'application/octet-stream';

    return { stream, contentType };
  }

  private async deleteFromGridFS(key: string): Promise<void> {
    try {
      const files = await this.bucket.find({ filename: key }).toArray();
      for (const file of files) {
        await this.bucket.delete(file._id as unknown as ObjectId);
      }
    } catch (error) {
      this.logger.warn(`Failed to delete file ${key}: ${error}`);
    }
  }
}
