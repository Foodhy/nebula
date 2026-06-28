import type { FileEntity, FileStatus, FileVersionEntity } from '../../domain/file.js';
import type { FolderEntity } from '../../domain/folder.js';
import type { ShareEntity } from '../../domain/share.js';
import type { Querier } from './db.js';

export interface NewFile {
  orgId: string;
  ownerId: string;
  name: string;
  mimeType: string;
  parentFolderId: string | null;
}

export interface FileRepo {
  create(db: Querier, file: NewFile): Promise<FileEntity>;
  findById(db: Querier, id: string): Promise<FileEntity | null>;
  /** Active files matching `q` by name that `userId` owns or has a share for. */
  search(db: Querier, userId: string, q: string, limit?: number): Promise<FileEntity[]>;
  update(
    db: Querier,
    id: string,
    patch: Partial<{
      name: string;
      parentFolderId: string | null;
      status: FileStatus;
      currentVersionId: string;
      size: number;
      mimeType: string;
    }>,
  ): Promise<FileEntity | null>;
}

export interface NewVersion {
  fileId: string;
  orgId: string;
  versionNo: number;
  objectKey: string;
  createdBy: string;
}

export interface VersionRepo {
  create(db: Querier, v: NewVersion): Promise<FileVersionEntity>;
  maxVersionNo(db: Querier, fileId: string): Promise<number | null>;
  listByFile(db: Querier, fileId: string): Promise<FileVersionEntity[]>;
  findByFileAndNo(db: Querier, fileId: string, no: number): Promise<FileVersionEntity | null>;
  setSizeAndChecksum(db: Querier, id: string, size: number, checksum: string): Promise<void>;
}

export interface NewFolder {
  orgId: string;
  ownerId: string;
  name: string;
  parentFolderId: string | null;
}

export interface FolderRepo {
  create(db: Querier, folder: NewFolder): Promise<FolderEntity>;
  findById(db: Querier, id: string): Promise<FolderEntity | null>;
  listChildren(
    db: Querier,
    parentFolderId: string | null,
  ): Promise<{ folders: FolderEntity[]; files: FileEntity[] }>;
}

export interface NewShare {
  orgId: string;
  resourceId: string;
  resourceType: ShareEntity['resourceType'];
  granteeType: ShareEntity['granteeType'];
  granteeId: string | null;
  permission: ShareEntity['permission'];
  expiresAt: Date | null;
}

export interface ShareRepo {
  create(db: Querier, share: NewShare): Promise<ShareEntity>;
  listForResource(db: Querier, resourceId: string): Promise<ShareEntity[]>;
  findForGrantee(db: Querier, resourceId: string, granteeId: string): Promise<ShareEntity | null>;
}

/** Runs a unit of work inside an org-scoped transaction (RLS active). */
export interface TenantRunner {
  run<T>(orgId: string, fn: (db: Querier) => Promise<T>): Promise<T>;
}

export const FILE_REPO = Symbol('VEGA_FILE_REPO');
export const VERSION_REPO = Symbol('VEGA_VERSION_REPO');
export const FOLDER_REPO = Symbol('VEGA_FOLDER_REPO');
export const SHARE_REPO = Symbol('VEGA_SHARE_REPO');
export const TENANT_RUNNER = Symbol('VEGA_TENANT_RUNNER');
export const EVENT_PUBLISHER = Symbol('VEGA_EVENT_PUBLISHER');
