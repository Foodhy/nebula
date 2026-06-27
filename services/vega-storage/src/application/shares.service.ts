import { assertOrgAccess } from '@nebula/security';
import type { Permission } from '@nebula/types';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { canEdit } from '../domain/share.js';
import type { GranteeType, ResourceType } from '../domain/share.js';
import { type EventPublisher } from './ports/events.port.js';
import {
  EVENT_PUBLISHER,
  FILE_REPO,
  type FileRepo,
  SHARE_REPO,
  type ShareRepo,
  TENANT_RUNNER,
  type TenantRunner,
} from './ports/repos.port.js';

export interface CreateShareInput {
  resourceId: string;
  resourceType: ResourceType;
  granteeType: GranteeType;
  granteeId: string | null;
  permission: Permission;
  expiresAt: Date | null;
}

@Injectable()
export class SharesService {
  constructor(
    @Inject(TENANT_RUNNER) private readonly tx: TenantRunner,
    @Inject(SHARE_REPO) private readonly shares: ShareRepo,
    @Inject(FILE_REPO) private readonly files: FileRepo,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async create(orgId: string, userId: string, input: CreateShareInput) {
    const share = await this.tx.run(orgId, async (db) => {
      // F1 supports sharing files; folder sharing lands with the UI push.
      if (input.resourceType !== 'file') {
        throw new ForbiddenException('only file sharing is supported in F1');
      }
      const file = await this.files.findById(db, input.resourceId);
      if (!file) throw new NotFoundException('resource not found');
      assertOrgAccess(orgId, file.orgId);

      // Only the owner or an editor may share.
      const isOwner = file.ownerId === userId;
      if (!isOwner) {
        const existing = await this.shares.findForGrantee(db, file.id, userId);
        if (!existing || !canEdit(existing.permission)) {
          throw new ForbiddenException('requires owner or editor to share');
        }
      }

      return this.shares.create(db, {
        orgId,
        resourceId: input.resourceId,
        resourceType: input.resourceType,
        granteeType: input.granteeType,
        granteeId: input.granteeId,
        permission: input.permission,
        expiresAt: input.expiresAt,
      });
    });

    await this.events.publish('file.shared', {
      type: 'file.shared',
      orgId,
      occurredAt: new Date().toISOString(),
      payload: { resourceId: share.resourceId, permission: share.permission },
    });
    return share;
  }
}
