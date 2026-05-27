import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import type { Readable } from 'stream';

@Injectable()
export class MinioClient implements OnModuleInit {
  private client: S3Client;
  private bucket: string;
  private publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.config.get<number>('MINIO_PORT', 9000);
    const useSsl = this.config.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const protocol = useSsl ? 'https' : 'http';

    this.bucket = this.config.get<string>('MINIO_BUCKET', 'publicacao-renders');

    // For URLs we hand off to external services (Meta Graph, LinkedIn API),
    // prefer a public base — typically a tunnel/proxy in dev or the production
    // domain in prod. Falls back to the raw MinIO endpoint for offline work.
    const publicBase = this.config.get<string>('PUBLIC_BASE_URL');
    this.publicBaseUrl = publicBase
      ? `${publicBase.replace(/\/$/, '')}/api/v1/files`
      : `${protocol}://${endpoint}:${port}/${this.bucket}`;

    this.client = new S3Client({
      endpoint: `${protocol}://${endpoint}:${port}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
        secretAccessKey: this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
      },
      forcePathStyle: true,
    });
  }

  async putBuffer(key: string, buf: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buf,
        ContentType: contentType,
        CacheControl: 'max-age=300',
      }),
    );
  }

  async removeObjects(keys: string[]): Promise<void> {
    if (!keys.length) return;
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    );
  }

  /**
   * Returns the object body as a Node.js Readable stream, plus content metadata.
   * Used by the public `/files` proxy controller so Meta/LinkedIn can fetch
   * rendered images through our public ngrok URL without exposing the MinIO
   * endpoint directly.
   */
  async getObject(
    key: string,
  ): Promise<{ body: Readable; contentType?: string; contentLength?: number }> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        body: res.Body as Readable,
        contentType: res.ContentType,
        contentLength: res.ContentLength,
      };
    } catch (err) {
      const code = (err as { name?: string })?.name;
      if (code === 'NoSuchKey' || code === 'NotFound') {
        throw new NotFoundException(`File ${key} not found`);
      }
      throw err;
    }
  }

  publicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }
}
