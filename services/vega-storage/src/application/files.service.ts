import { assertOrgAccess } from '@nebula/security';
import type { Permission } from '@nebula/types';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { FileEntity } from '../domain/file.js';
import { nextVersionNo, objectKeyFor } from '../domain/file.js';
import { canEdit, canView } from '../domain/share.js';
import type { Querier } from './ports/db.js';
import { type EventPublisher } from './ports/events.port.js';
import { KEY_PROVIDER, type KeyProvider } from './ports/key-provider.port.js';
import {
  EVENT_PUBLISHER,
  FILE_REPO,
  type FileRepo,
  SHARE_REPO,
  type ShareRepo,
  TENANT_RUNNER,
  type TenantRunner,
  VERSION_REPO,
  type VersionRepo,
} from './ports/repos.port.js';
import { OBJECT_STORE, type ObjectStore } from './ports/storage.port.js';

export interface UploadInitInput {
  name: string;
  mimeType: string;
  parentFolderId: string | null;
}

@Injectable()
export class FilesService {
  constructor(
    @Inject(TENANT_RUNNER) private readonly tx: TenantRunner,
    @Inject(FILE_REPO) private readonly files: FileRepo,
    @Inject(VERSION_REPO) private readonly versions: VersionRepo,
    @Inject(SHARE_REPO) private readonly shares: ShareRepo,
    @Inject(OBJECT_STORE) private readonly store: ObjectStore,
    @Inject(KEY_PROVIDER) private readonly keys: KeyProvider,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  /** Highest permission a user holds on a file: owner, else any share, else null. */
  private async permissionFor(
    db: Querier,
    file: FileEntity,
    userId: string,
  ): Promise<Permission | null> {
    if (file.ownerId === userId) return 'owner';
    const share = await this.shares.findForGrantee(db, file.id, userId);
    return share?.permission ?? null;
  }

  private async loadOwned(
    db: Querier,
    orgId: string,
    fileId: string,
    userId: string,
    need: 'view' | 'edit',
  ): Promise<{ file: FileEntity; permission: Permission }> {
    const file = await this.files.findById(db, fileId);
    if (!file) throw new NotFoundException('file not found');
    assertOrgAccess(orgId, file.orgId); // defense in depth above RLS
    const permission = await this.permissionFor(db, file, userId);
    if (!permission) throw new NotFoundException('file not found');
    const ok = need === 'edit' ? canEdit(permission) : canView(permission);
    if (!ok) throw new ForbiddenException(`requires ${need} permission`);
    return { file, permission };
  }

  async uploadInit(orgId: string, userId: string, input: UploadInitInput) {
    const bucket = this.keys.bucketFor(orgId);
    await this.store.ensureBucket(bucket);

    return this.tx.run(orgId, async (db) => {
      const file = await this.files.create(db, {
        orgId,
        ownerId: userId,
        name: input.name,
        mimeType: input.mimeType,
        parentFolderId: input.parentFolderId,
      });
      const versionNo = nextVersionNo(null);
      const objectKey = objectKeyFor(file.id, versionNo);
      const version = await this.versions.create(db, {
        fileId: file.id,
        orgId,
        versionNo,
        objectKey,
        createdBy: userId,
      });
      const uploadUrl = await this.store.presignPut(bucket, objectKey);
      return { fileId: file.id, versionId: version.id, objectKey, uploadUrl };
    });
  }

  async uploadComplete(orgId: string, userId: string, fileId: string) {
    const bucket = this.keys.bucketFor(orgId);
    const result = await this.tx.run(orgId, async (db) => {
      const { file } = await this.loadOwned(db, orgId, fileId, userId, 'edit');
      const maxNo = await this.versions.maxVersionNo(db, fileId);
      const version = await this.versions.findByFileAndNo(db, fileId, maxNo ?? 1);
      if (!version) throw new NotFoundException('version not found');

      const stat = await this.store.stat(bucket, version.objectKey);
      if (!stat) throw new NotFoundException('uploaded object not found in storage');

      await this.versions.setSizeAndChecksum(db, version.id, stat.size, stat.etag);
      const updated = await this.files.update(db, fileId, {
        currentVersionId: version.id,
        size: stat.size,
        status: 'active',
      });
      return { file: updated ?? file, versionId: version.id, versionNo: version.versionNo };
    });

    const occurredAt = new Date().toISOString();
    await this.events.publish('version.created', {
      type: 'version.created',
      orgId,
      occurredAt,
      payload: { fileId, versionId: result.versionId, versionNo: result.versionNo },
    });
    await this.events.publish('file.created', {
      type: 'file.created',
      orgId,
      occurredAt,
      payload: { fileId, name: result.file.name, size: result.file.size },
    });
    return result.file;
  }

  search(orgId: string, userId: string, q: string): Promise<FileEntity[]> {
    return this.tx.run(orgId, (db) => this.files.search(db, userId, q));
  }

  get(orgId: string, userId: string, fileId: string): Promise<FileEntity> {
    return this.tx.run(orgId, async (db) => {
      const { file } = await this.loadOwned(db, orgId, fileId, userId, 'view');
      return file;
    });
  }

  async contentUrl(orgId: string, userId: string, fileId: string): Promise<string> {
    const bucket = this.keys.bucketFor(orgId);
    return this.tx.run(orgId, async (db) => {
      const { file } = await this.loadOwned(db, orgId, fileId, userId, 'view');
      if (!file.currentVersionId) throw new NotFoundException('file has no content');
      const maxNo = await this.versions.maxVersionNo(db, fileId);
      const version = await this.versions.findByFileAndNo(db, fileId, maxNo ?? 1);
      if (!version) throw new NotFoundException('version not found');
      return this.store.presignGet(bucket, version.objectKey);
    });
  }

  listVersions(orgId: string, userId: string, fileId: string) {
    return this.tx.run(orgId, async (db) => {
      await this.loadOwned(db, orgId, fileId, userId, 'view');
      return this.versions.listByFile(db, fileId);
    });
  }

  async restore(orgId: string, userId: string, fileId: string, versionNo: number) {
    const result = await this.tx.run(orgId, async (db) => {
      await this.loadOwned(db, orgId, fileId, userId, 'edit');
      const src = await this.versions.findByFileAndNo(db, fileId, versionNo);
      if (!src) throw new NotFoundException('version not found');
      const newNo = nextVersionNo(await this.versions.maxVersionNo(db, fileId));
      // New version reuses the restored content (same object key content).
      const created = await this.versions.create(db, {
        fileId,
        orgId,
        versionNo: newNo,
        objectKey: src.objectKey,
        createdBy: userId,
      });
      if (src.size)
        await this.versions.setSizeAndChecksum(db, created.id, src.size, src.checksum ?? '');
      const updated = await this.files.update(db, fileId, {
        currentVersionId: created.id,
        size: src.size,
      });
      return { file: updated, versionId: created.id, versionNo: newNo };
    });
    await this.events.publish('version.created', {
      type: 'version.created',
      orgId,
      occurredAt: new Date().toISOString(),
      payload: { fileId, versionId: result.versionId, versionNo: result.versionNo, restored: true },
    });
    return result.file;
  }

  async patch(
    orgId: string,
    userId: string,
    fileId: string,
    patch: { name?: string; parentFolderId?: string | null },
  ) {
    const file = await this.tx.run(orgId, async (db) => {
      await this.loadOwned(db, orgId, fileId, userId, 'edit');
      return this.files.update(db, fileId, patch);
    });
    await this.events.publish('file.updated', {
      type: 'file.updated',
      orgId,
      occurredAt: new Date().toISOString(),
      payload: { fileId },
    });
    return file;
  }

  async trash(orgId: string, userId: string, fileId: string) {
    await this.tx.run(orgId, async (db) => {
      await this.loadOwned(db, orgId, fileId, userId, 'edit');
      await this.files.update(db, fileId, { status: 'trashed' });
    });
    await this.events.publish('file.trashed', {
      type: 'file.trashed',
      orgId,
      occurredAt: new Date().toISOString(),
      payload: { fileId },
    });
    return { id: fileId, status: 'trashed' as const };
  }
}
