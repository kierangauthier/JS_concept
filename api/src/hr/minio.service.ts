import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private client!: Minio.Client;
  private bucket!: string;

  async onModuleInit() {
    this.bucket = process.env.MINIO_HR_BUCKET || 'hr-documents';

    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      useSSL: false,
    });

    await this.ensureBucket();
  }

  private async ensureBucket() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        console.log(`[MinIO] Created bucket: ${this.bucket}`);
      }
    } catch (err: any) {
      console.error(`[MinIO] Failed to ensure bucket: ${err.message}`);
    }
  }

  async getPresignedPutUrl(key: string, contentType: string): Promise<string> {
    // 15 minutes expiry
    return this.client.presignedPutObject(this.bucket, key, 15 * 60);
  }

  async getPresignedGetUrl(key: string): Promise<string> {
    // 1 hour expiry
    return this.client.presignedGetObject(this.bucket, key, 60 * 60);
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
