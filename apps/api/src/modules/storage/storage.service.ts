import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Environment,
  type EnvironmentVariables,
} from '../../config/env.validation.js';

const LINK_SECONDS = 300;

export interface StoredFile {
  size: number;
  type: string | undefined;
}

// The only file that talks to the file storage: R2 in production, S3Proxy on the PC
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly onThePc: boolean;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.s3 = new S3Client({
      endpoint: config.get('S3_ENDPOINT', { infer: true }),
      region: 'auto',
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY_ID', { infer: true }),
        secretAccessKey: config.get('S3_SECRET_ACCESS_KEY', { infer: true }),
      },
      // The SDK's default checksums aren't understood by every S3-compatible server
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
    this.bucket = config.get('S3_BUCKET', { infer: true });
    this.onThePc =
      config.get('NODE_ENV', { infer: true }) === Environment.Development;
  }

  // S3Proxy starts empty; the R2 bucket is created by hand
  async onModuleInit() {
    if (!this.onThePc) {
      return;
    }
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      if (!isNotFound(error)) {
        this.logger.warn(`File storage unreachable: ${describe(error)}`);
        return;
      }
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket ${this.bucket} created`);
    }
  }

  async save(key: string, body: Buffer, type: string, fileName?: string) {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: type,
        ContentDisposition: fileName
          ? `inline; filename="${fileName}"`
          : undefined,
      }),
    );
  }

  async read(key: string): Promise<Buffer> {
    const { Body } = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!Body) {
      throw new Error(`Empty file: ${key}`);
    }
    return Buffer.from(await Body.transformToByteArray());
  }

  // null when nothing is stored under this key; other errors still throw
  async readIfExists(key: string): Promise<Buffer | null> {
    try {
      return await this.read(key);
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  // null when nothing is stored under this key
  async check(key: string): Promise<StoredFile | null> {
    try {
      const head = await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return { size: head.ContentLength ?? 0, type: head.ContentType };
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  // Five minutes to read one file, without the storage keys
  linkToRead(key: string): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: LINK_SECONDS },
    );
  }

  // Five minutes to upload one file of exactly this type and size
  linkToUpload(key: string, type: string, size: number): Promise<string> {
    return getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: type,
        ContentLength: size,
      }),
      {
        expiresIn: LINK_SECONDS,
        signableHeaders: new Set(['content-type', 'content-length']),
      },
    );
  }
}

function isNotFound(error: unknown): boolean {
  return (
    error instanceof S3ServiceException &&
    error.$metadata.httpStatusCode === 404
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message || error.name : String(error);
}
