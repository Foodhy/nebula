import { Permission } from '@nebula/types';
import { z } from 'zod';

export const UploadInitDto = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(255).default('application/octet-stream'),
  parentFolderId: z.string().uuid().nullable().default(null),
});

export const PatchFileDto = z
  .object({
    name: z.string().min(1).max(255).optional(),
    parentFolderId: z.string().uuid().nullable().optional(),
  })
  .refine((v) => v.name !== undefined || v.parentFolderId !== undefined, {
    message: 'name or parentFolderId required',
  });

export const CreateFolderDto = z.object({
  name: z.string().min(1).max(255),
  parentFolderId: z.string().uuid().nullable().default(null),
});

export const CreateShareDto = z.object({
  resourceId: z.string().uuid(),
  resourceType: z.enum(['file', 'folder']).default('file'),
  granteeType: z.enum(['user', 'link', 'org']).default('user'),
  granteeId: z.string().min(1).nullable().default(null),
  permission: Permission,
  expiresAt: z.coerce.date().nullable().default(null),
});
