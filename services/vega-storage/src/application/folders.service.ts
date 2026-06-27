import { Inject, Injectable } from '@nestjs/common';
import {
  FOLDER_REPO,
  type FolderRepo,
  TENANT_RUNNER,
  type TenantRunner,
} from './ports/repos.port.js';

@Injectable()
export class FoldersService {
  constructor(
    @Inject(TENANT_RUNNER) private readonly tx: TenantRunner,
    @Inject(FOLDER_REPO) private readonly folders: FolderRepo,
  ) {}

  create(orgId: string, userId: string, input: { name: string; parentFolderId: string | null }) {
    return this.tx.run(orgId, (db) =>
      this.folders.create(db, {
        orgId,
        ownerId: userId,
        name: input.name,
        parentFolderId: input.parentFolderId,
      }),
    );
  }

  listChildren(orgId: string, folderId: string | null) {
    return this.tx.run(orgId, (db) => this.folders.listChildren(db, folderId));
  }
}
