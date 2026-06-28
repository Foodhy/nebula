import type { Querier } from '../application/ports/db.js';
import type {
  FileRepo,
  FolderRepo,
  NewFile,
  NewFolder,
  NewShare,
  NewVersion,
  ShareRepo,
  VersionRepo,
} from '../application/ports/repos.port.js';
import type { FileEntity, FileVersionEntity } from '../domain/file.js';
import type { FolderEntity } from '../domain/folder.js';
import type { ShareEntity } from '../domain/share.js';

/* ---- row types + mappers ---- */
interface FileRow {
  id: string;
  org_id: string;
  owner_id: string;
  name: string;
  mime_type: string;
  size: string | number;
  parent_folder_id: string | null;
  current_version_id: string | null;
  status: FileEntity['status'];
  created_at: Date;
  updated_at: Date;
}
const toFile = (r: FileRow): FileEntity => ({
  id: r.id,
  orgId: r.org_id,
  ownerId: r.owner_id,
  name: r.name,
  mimeType: r.mime_type,
  size: Number(r.size),
  parentFolderId: r.parent_folder_id,
  currentVersionId: r.current_version_id,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

interface VersionRow {
  id: string;
  file_id: string;
  org_id: string;
  version_no: number;
  object_key: string;
  checksum: string | null;
  size: string | number;
  created_by: string;
  created_at: Date;
}
const toVersion = (r: VersionRow): FileVersionEntity => ({
  id: r.id,
  fileId: r.file_id,
  orgId: r.org_id,
  versionNo: r.version_no,
  objectKey: r.object_key,
  checksum: r.checksum,
  size: Number(r.size),
  createdBy: r.created_by,
  createdAt: r.created_at,
});

interface FolderRow {
  id: string;
  org_id: string;
  owner_id: string;
  name: string;
  parent_folder_id: string | null;
  created_at: Date;
}
const toFolder = (r: FolderRow): FolderEntity => ({
  id: r.id,
  orgId: r.org_id,
  ownerId: r.owner_id,
  name: r.name,
  parentFolderId: r.parent_folder_id,
  createdAt: r.created_at,
});

interface ShareRow {
  id: string;
  org_id: string;
  resource_id: string;
  resource_type: ShareEntity['resourceType'];
  grantee_type: ShareEntity['granteeType'];
  grantee_id: string | null;
  permission: ShareEntity['permission'];
  expires_at: Date | null;
}
const toShare = (r: ShareRow): ShareEntity => ({
  id: r.id,
  orgId: r.org_id,
  resourceId: r.resource_id,
  resourceType: r.resource_type,
  granteeType: r.grantee_type,
  granteeId: r.grantee_id,
  permission: r.permission,
  expiresAt: r.expires_at,
});

/* ---- repositories ---- */
export class PgFileRepo implements FileRepo {
  async create(db: Querier, f: NewFile): Promise<FileEntity> {
    const { rows } = await db.query<FileRow>(
      `INSERT INTO files (org_id, owner_id, name, mime_type, parent_folder_id, status)
       VALUES ($1,$2,$3,$4,$5,'active') RETURNING *`,
      [f.orgId, f.ownerId, f.name, f.mimeType, f.parentFolderId],
    );
    return toFile(rows[0] as FileRow);
  }

  async findById(db: Querier, id: string): Promise<FileEntity | null> {
    const { rows } = await db.query<FileRow>('SELECT * FROM files WHERE id = $1', [id]);
    return rows[0] ? toFile(rows[0]) : null;
  }

  async search(db: Querier, userId: string, q: string, limit = 50): Promise<FileEntity[]> {
    const { rows } = await db.query<FileRow>(
      `SELECT * FROM files f
       WHERE f.status = 'active' AND f.name ILIKE $1
         AND (f.owner_id = $2 OR EXISTS (
           SELECT 1 FROM shares s WHERE s.resource_id = f.id AND s.grantee_id = $2::text
             AND (s.expires_at IS NULL OR s.expires_at > now())))
       ORDER BY f.name LIMIT $3`,
      [`%${q}%`, userId, limit],
    );
    return rows.map(toFile);
  }

  async update(
    db: Querier,
    id: string,
    patch: Partial<{
      name: string;
      parentFolderId: string | null;
      status: FileEntity['status'];
      currentVersionId: string;
      size: number;
      mimeType: string;
    }>,
  ): Promise<FileEntity | null> {
    const cols: string[] = [];
    const vals: unknown[] = [];
    const map: Record<string, unknown> = {
      name: patch.name,
      parent_folder_id: patch.parentFolderId,
      status: patch.status,
      current_version_id: patch.currentVersionId,
      size: patch.size,
      mime_type: patch.mimeType,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        vals.push(val);
        cols.push(`${col} = $${vals.length}`);
      }
    }
    if (cols.length === 0) return this.findById(db, id);
    vals.push(id);
    const { rows } = await db.query<FileRow>(
      `UPDATE files SET ${cols.join(', ')}, updated_at = now() WHERE id = $${vals.length} RETURNING *`,
      vals,
    );
    return rows[0] ? toFile(rows[0]) : null;
  }
}

export class PgVersionRepo implements VersionRepo {
  async create(db: Querier, v: NewVersion): Promise<FileVersionEntity> {
    const { rows } = await db.query<VersionRow>(
      `INSERT INTO file_versions (file_id, org_id, version_no, object_key, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [v.fileId, v.orgId, v.versionNo, v.objectKey, v.createdBy],
    );
    return toVersion(rows[0] as VersionRow);
  }

  async maxVersionNo(db: Querier, fileId: string): Promise<number | null> {
    const { rows } = await db.query<{ max: number | null }>(
      'SELECT MAX(version_no) AS max FROM file_versions WHERE file_id = $1',
      [fileId],
    );
    return rows[0]?.max ?? null;
  }

  async listByFile(db: Querier, fileId: string): Promise<FileVersionEntity[]> {
    const { rows } = await db.query<VersionRow>(
      'SELECT * FROM file_versions WHERE file_id = $1 ORDER BY version_no DESC',
      [fileId],
    );
    return rows.map(toVersion);
  }

  async findByFileAndNo(
    db: Querier,
    fileId: string,
    no: number,
  ): Promise<FileVersionEntity | null> {
    const { rows } = await db.query<VersionRow>(
      'SELECT * FROM file_versions WHERE file_id = $1 AND version_no = $2',
      [fileId, no],
    );
    return rows[0] ? toVersion(rows[0]) : null;
  }

  async setSizeAndChecksum(db: Querier, id: string, size: number, checksum: string): Promise<void> {
    await db.query('UPDATE file_versions SET size = $1, checksum = $2 WHERE id = $3', [
      size,
      checksum,
      id,
    ]);
  }
}

export class PgFolderRepo implements FolderRepo {
  async create(db: Querier, f: NewFolder): Promise<FolderEntity> {
    const { rows } = await db.query<FolderRow>(
      `INSERT INTO folders (org_id, owner_id, name, parent_folder_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [f.orgId, f.ownerId, f.name, f.parentFolderId],
    );
    return toFolder(rows[0] as FolderRow);
  }

  async findById(db: Querier, id: string): Promise<FolderEntity | null> {
    const { rows } = await db.query<FolderRow>('SELECT * FROM folders WHERE id = $1', [id]);
    return rows[0] ? toFolder(rows[0]) : null;
  }

  async listChildren(
    db: Querier,
    parentFolderId: string | null,
  ): Promise<{ folders: FolderEntity[]; files: FileEntity[] }> {
    const cond = parentFolderId === null ? 'parent_folder_id IS NULL' : 'parent_folder_id = $1';
    const params = parentFolderId === null ? [] : [parentFolderId];
    const folders = await db.query<FolderRow>(
      `SELECT * FROM folders WHERE ${cond} ORDER BY name`,
      params,
    );
    const files = await db.query<FileRow>(
      `SELECT * FROM files WHERE ${cond} AND status = 'active' ORDER BY name`,
      params,
    );
    return { folders: folders.rows.map(toFolder), files: files.rows.map(toFile) };
  }
}

export class PgShareRepo implements ShareRepo {
  async create(db: Querier, s: NewShare): Promise<ShareEntity> {
    const { rows } = await db.query<ShareRow>(
      `INSERT INTO shares (org_id, resource_id, resource_type, grantee_type, grantee_id, permission, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        s.orgId,
        s.resourceId,
        s.resourceType,
        s.granteeType,
        s.granteeId,
        s.permission,
        s.expiresAt,
      ],
    );
    return toShare(rows[0] as ShareRow);
  }

  async listForResource(db: Querier, resourceId: string): Promise<ShareEntity[]> {
    const { rows } = await db.query<ShareRow>('SELECT * FROM shares WHERE resource_id = $1', [
      resourceId,
    ]);
    return rows.map(toShare);
  }

  async findForGrantee(
    db: Querier,
    resourceId: string,
    granteeId: string,
  ): Promise<ShareEntity | null> {
    const { rows } = await db.query<ShareRow>(
      `SELECT * FROM shares
       WHERE resource_id = $1 AND grantee_id = $2
         AND (expires_at IS NULL OR expires_at > now())
       ORDER BY permission DESC LIMIT 1`,
      [resourceId, granteeId],
    );
    return rows[0] ? toShare(rows[0]) : null;
  }
}
