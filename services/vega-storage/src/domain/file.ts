export type FileStatus = 'active' | 'trashed' | 'deleted';

export interface FileEntity {
  id: string;
  orgId: string;
  ownerId: string;
  name: string;
  mimeType: string;
  size: number;
  parentFolderId: string | null;
  currentVersionId: string | null;
  status: FileStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileVersionEntity {
  id: string;
  fileId: string;
  orgId: string;
  versionNo: number;
  objectKey: string;
  checksum: string | null;
  size: number;
  createdBy: string;
  createdAt: Date;
}

/** Next version number given the current highest (0 when none). */
export function nextVersionNo(currentMax: number | null): number {
  return (currentMax ?? 0) + 1;
}

/** Deterministic MinIO object key for a file version (unique per version). */
export function objectKeyFor(fileId: string, versionNo: number): string {
  return `files/${fileId}/v${versionNo}`;
}
