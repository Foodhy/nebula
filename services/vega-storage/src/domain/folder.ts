export interface FolderEntity {
  id: string;
  orgId: string;
  ownerId: string;
  name: string;
  parentFolderId: string | null;
  createdAt: Date;
}
