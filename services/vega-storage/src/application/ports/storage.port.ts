export interface ObjectStat {
  size: number;
  etag: string;
  encryption: string | null; // x-amz-server-side-encryption header, if present
}

/** Object storage port (MinIO/S3). Bytes flow client↔store via presigned URLs. */
export interface ObjectStore {
  /** Create the bucket if missing and enable SSE-S3 auto-encryption. */
  ensureBucket(bucket: string): Promise<void>;
  /** Presigned PUT URL for a direct client upload. */
  presignPut(bucket: string, key: string, expiresSec?: number): Promise<string>;
  /** Presigned GET URL for a direct client download. */
  presignGet(bucket: string, key: string, expiresSec?: number): Promise<string>;
  /** Stat an object (size/etag/encryption); null if absent. */
  stat(bucket: string, key: string): Promise<ObjectStat | null>;
}

export const OBJECT_STORE = Symbol('VEGA_OBJECT_STORE');
