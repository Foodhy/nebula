import { tenantRlsSql } from '@nebula/db';
import { NotFoundException } from '@nestjs/common';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FilesService } from '../application/files.service.js';
import { noopPublisher } from '../application/ports/events.port.js';
import { SharesService } from '../application/shares.service.js';
import { EnvKeyProvider } from './env-key-provider.js';
import { PgFileRepo, PgFolderRepo, PgShareRepo, PgVersionRepo } from './repositories.js';
import { S3ObjectStore } from './s3-object-store.js';
import { PgTenantRunner } from './tenant-runner.js';

const ORG_A = '00000000-0000-0000-0000-0000000000a0';
const ORG_B = '00000000-0000-0000-0000-0000000000b0';
const A_OWNER = '00000000-0000-0000-0000-00000000a001';
const A_OTHER = '00000000-0000-0000-0000-00000000a002';
const A_STRANGER = '00000000-0000-0000-0000-00000000a003';
const B_USER = '00000000-0000-0000-0000-00000000b001';
const KMS_KEY = 'nebula-key';

let pg: StartedPostgreSqlContainer;
let minio: StartedTestContainer;
let adminPool: Pool;
let appPool: Pool;
let files: FilesService;
let shares: SharesService;

beforeAll(async () => {
  pg = await new PostgreSqlContainer('postgres:16-alpine').start();
  adminPool = new Pool({ connectionString: pg.getConnectionUri() });

  await adminPool.query(`
    CREATE TABLE folders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL,
      owner_id uuid NOT NULL, name text NOT NULL, parent_folder_id uuid, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE files (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL,
      owner_id uuid NOT NULL, name text NOT NULL, mime_type text NOT NULL DEFAULT 'application/octet-stream',
      size bigint NOT NULL DEFAULT 0, parent_folder_id uuid, current_version_id uuid,
      status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE file_versions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), file_id uuid NOT NULL,
      org_id uuid NOT NULL, version_no integer NOT NULL, object_key text NOT NULL, checksum text,
      size bigint NOT NULL DEFAULT 0, created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (file_id, version_no));
    CREATE TABLE shares (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL,
      resource_id uuid NOT NULL, resource_type text NOT NULL, grantee_type text NOT NULL,
      grantee_id text, permission text NOT NULL, expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
  `);
  for (const t of ['folders', 'files', 'file_versions', 'shares']) {
    await adminPool.query(tenantRlsSql(t));
  }
  await adminPool.query(`CREATE ROLE nebula_app LOGIN PASSWORD 'app-pw'`);
  await adminPool.query(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON folders, files, file_versions, shares TO nebula_app',
  );

  appPool = new Pool({
    host: pg.getHost(),
    port: pg.getMappedPort(5432),
    database: pg.getDatabase(),
    user: 'nebula_app',
    password: 'app-pw',
  });

  minio = await new GenericContainer('minio/minio:latest')
    .withCommand(['server', '/data'])
    .withEnvironment({
      MINIO_ROOT_USER: 'minioadmin',
      MINIO_ROOT_PASSWORD: 'minioadmin',
      MINIO_KMS_SECRET_KEY: `${KMS_KEY}:3vqzQAmnI3kE8OHoSX1pALI7AJqe8OTykbIPGtf9uG8=`,
    })
    .withExposedPorts(9000)
    .withWaitStrategy(Wait.forHttp('/minio/health/live', 9000).forStatusCode(200))
    .start();

  const store = new S3ObjectStore({
    endpoint: `http://${minio.getHost()}:${minio.getMappedPort(9000)}`,
    region: 'us-east-1',
    accessKey: 'minioadmin',
    secretKey: 'minioadmin',
    kmsKeyName: KMS_KEY,
  });
  const keys = new EnvKeyProvider(KMS_KEY);
  const runner = new PgTenantRunner(appPool);
  files = new FilesService(
    runner,
    new PgFileRepo(),
    new PgVersionRepo(),
    new PgShareRepo(),
    store,
    keys,
    noopPublisher,
  );
  shares = new SharesService(runner, new PgShareRepo(), new PgFileRepo(), noopPublisher);
}, 180_000);

afterAll(async () => {
  await appPool?.end();
  await adminPool?.end();
  await minio?.stop();
  await pg?.stop();
});

async function uploadFile(orgId: string, userId: string, name: string, body: string) {
  const init = await files.uploadInit(orgId, userId, {
    name,
    mimeType: 'text/plain',
    parentFolderId: null,
  });
  const put = await fetch(init.uploadUrl, { method: 'PUT', body });
  expect(put.ok).toBe(true);
  const file = await files.uploadComplete(orgId, userId, init.fileId);
  return { fileId: init.fileId, file };
}

describe('vega-storage (integration)', () => {
  let fileId: string;

  it('uploads (presigned), records metadata, and stores encrypted', async () => {
    const { fileId: id, file } = await uploadFile(ORG_A, A_OWNER, 'hello.txt', 'hello vega');
    fileId = id;
    expect(file.size).toBe('hello vega'.length);
    expect(file.status).toBe('active');
    expect(file.currentVersionId).toBeTruthy();
  });

  it('downloads via presigned URL and content matches', async () => {
    const url = await files.contentUrl(ORG_A, A_OWNER, fileId);
    const res = await fetch(url);
    expect(await res.text()).toBe('hello vega');
    // SSE applied by bucket default encryption
    expect(res.headers.get('x-amz-server-side-encryption')).toBeTruthy();
  });

  it('lists versions and restores (new version reusing content)', async () => {
    const before = await files.listVersions(ORG_A, A_OWNER, fileId);
    expect(before).toHaveLength(1);
    await files.restore(ORG_A, A_OWNER, fileId, 1);
    const after = await files.listVersions(ORG_A, A_OWNER, fileId);
    expect(after).toHaveLength(2);
    expect(after[0]?.versionNo).toBe(2);
  });

  it('sharing: a viewer grantee can read; a stranger cannot', async () => {
    await shares.create(ORG_A, A_OWNER, {
      resourceId: fileId,
      resourceType: 'file',
      granteeType: 'user',
      granteeId: A_OTHER,
      permission: 'viewer',
      expiresAt: null,
    });
    await expect(files.get(ORG_A, A_OTHER, fileId)).resolves.toMatchObject({ id: fileId });
    await expect(files.get(ORG_A, A_STRANGER, fileId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('a viewer cannot edit (trash) the file', async () => {
    await expect(files.trash(ORG_A, A_OTHER, fileId)).rejects.toThrow();
  });

  // MANDATORY cross-tenant isolation (CLAUDE.md #3)
  it('org B cannot read org A file (RLS)', async () => {
    await expect(files.get(ORG_B, B_USER, fileId)).rejects.toBeInstanceOf(NotFoundException);
    await expect(files.contentUrl(ORG_B, B_USER, fileId)).rejects.toBeInstanceOf(NotFoundException);
    await expect(files.listVersions(ORG_B, B_USER, fileId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
