import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';

@Injectable()
export class MinioClient implements OnModuleInit {
  private client: S3Client;
  private bucket: string;
  private publicEndpoint: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.config.get<number>('MINIO_PORT', 9000);
    const useSsl = this.config.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const protocol = useSsl ? 'https' : 'http';

    this.bucket = this.config.get<string>('MINIO_BUCKET', 'publicacao-renders');
    this.publicEndpoint = `${protocol}://${endpoint}:${port}`;

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

  publicUrl(key: string): string {
    return `${this.publicEndpoint}/${this.bucket}/${key}`;
  }
}
