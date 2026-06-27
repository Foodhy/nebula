import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutBucketEncryptionCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ObjectStat, ObjectStore } from '../application/ports/storage.port.js';

export interface S3Config {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  kmsKeyName: string;
}

/** MinIO/S3-backed object store. Buckets get SSE-S3 default encryption (KMS). */
export class S3ObjectStore implements ObjectStore {
  private readonly s3: S3Client;

  constructor(private readonly cfg: S3Config) {
    this.s3 = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      forcePathStyle: true, // MinIO
      credentials: { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secretKey },
    });
  }

  async ensureBucket(bucket: string): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: bucket }));
    }
    // Default SSE so presigned PUTs (no SSE headers) still encrypt at rest.
    await this.s3.send(
      new PutBucketEncryptionCommand({
        Bucket: bucket,
        ServerSideEncryptionConfiguration: {
          Rules: [
            {
              ApplyServerSideEncryptionByDefault: {
                SSEAlgorithm: 'aws:kms',
                KMSMasterKeyID: this.cfg.kmsKeyName,
              },
            },
          ],
        },
      }),
    );
  }

  presignPut(bucket: string, key: string, expiresSec = 900): Promise<string> {
    return getSignedUrl(this.s3, new PutObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: expiresSec,
    });
  }

  presignGet(bucket: string, key: string, expiresSec = 900): Promise<string> {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: expiresSec,
    });
  }

  async stat(bucket: string, key: string): Promise<ObjectStat | null> {
    try {
      const r = await this.s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return {
        size: r.ContentLength ?? 0,
        etag: (r.ETag ?? '').replaceAll('"', ''),
        encryption: r.ServerSideEncryption ?? null,
      };
    } catch {
      return null;
    }
  }
}
