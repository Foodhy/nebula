# Vega · File storage

> The brightest star: the heart of the MVP. What users touch most.

## Responsibility

- Upload, download, organize (folders), move, rename, delete (trash) files.
- File **versioning**.
- **Sharing**: public/private links and per-user, with permissions.
- File search (via `nucleo-search`).
- Per-organization quotas.

**Does NOT do:** edit file contents (that's Lyra/Orión/Aurora). Vega stores bytes and metadata; editors read/write through it.

## Data model (conceptual)

```
File
  ├── id, org_id, owner_id
  ├── name, mime_type, size
  ├── parent_folder_id
  ├── current_version_id
  └── status: active | trashed | deleted
FileVersion
  ├── id, file_id, version_no
  ├── object_key (in MinIO)
  ├── checksum (SHA-256)
  └── created_by, created_at
Folder (hierarchical, per org)
Share
  ├── resource_id (file|folder)
  ├── grantee (user|link|org)
  ├── permission: viewer | commenter | editor | owner
  └── expires_at?
```

- **Metadata** → PostgreSQL (with RLS by `org_id`).
- **Bytes** → MinIO, bucket `org-<uuid>`, key = `object_key`.

## Main API

| Verb | Path | What it does |
|------|------|--------------|
| POST | `/files` (multipart or presigned) | Upload a file / new version. |
| GET  | `/files/:id` | Metadata. |
| GET  | `/files/:id/content` | Download (or presigned URL). |
| GET  | `/files/:id/versions` | List versions. |
| POST | `/files/:id/restore/:versionNo` | Restore a version. |
| PATCH| `/files/:id` | Rename/move. |
| DELETE| `/files/:id` | To trash (soft delete). |
| POST | `/shares` | Share a resource with a permission. |
| GET  | `/folders/:id/children` | List folder contents. |

## Large uploads

- **Multipart upload** via MinIO presigned URLs → the byte stream goes straight from the client to MinIO, not through the backend (scales better).
- The backend validates permissions and records metadata before/after.

## Events

- **Publishes:** `file.created`, `file.updated`, `file.trashed`, `file.shared`, `version.created`.
  - Consumers: `nucleo-search` (indexes), `nucleo-notifications` (alerts collaborators), `nucleo-audit` (records), thumbnail worker.
- **Consumes:** `user.deactivated` (reassign/transfer file ownership).

## Security

- **Encryption at rest** in MinIO (SSE) with a per-organization key (envelope encryption via Vault).
- Every access validates permission via `nucleo-policy`.
- Presigned URLs with short expiry.
- Checksums (SHA-256) for integrity.
- Cross-tenant isolation verified by mandatory tests (see `08-testing.md`).

## Performance considerations

- Thumbnails and previews generated async (don't block upload).
- Pagination on large folder listings.
- Hot-metadata cache in Redis.
