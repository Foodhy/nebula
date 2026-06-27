# vega-storage · File storage service

Drive backend (F1). Files, folders, versions, sharing. Bytes in MinIO (SSE-S3,
bucket-per-org `org-<uuid>`); metadata in Postgres with **RLS** (tenant isolation).
Hexagonal: `domain/` → `application/` → `infra/` → `api/`.

## API (JWT-guarded; org/user from the token)

| Verb | Path | Notes |
|------|------|-------|
| POST | `/files/upload-init` | returns presigned PUT URL + objectKey |
| POST | `/files/:id/upload-complete` | stat object → record size/checksum, publish `file.created` |
| GET | `/files/:id` · `/files/:id/content` · `/files/:id/versions` | content returns a presigned GET URL |
| POST | `/files/:id/restore/:versionNo` | new version reusing old content |
| PATCH | `/files/:id` | rename / move |
| DELETE | `/files/:id` | trash (soft) |
| POST | `/folders` · GET `/folders/:id/children` | `id=root` → top level |
| POST | `/shares` | owner/editor only; emits `file.shared` |

## Security

- Every tenant table has `org_id` + RLS; service connects as non-superuser
  `nebula_app`; `withTenant` (`@nebula/db`) sets `app.org_id` per request from the
  JWT. `assertOrgAccess` is defense-in-depth above RLS.
- Sharing enforced in-service for F1 (extract to `nucleo-policy` in F2).
- Encryption at rest: MinIO SSE-S3 via built-in KMS; `KeyProvider` port lets a
  Vault per-org-key implementation slot in later.

## Run

```bash
docker compose -f infra/compose/deps.yml --env-file .env up -d   # Postgres + MinIO (KMS)
pnpm --filter @nebula/vega-storage migrate up                     # needs DATABASE_URL
pnpm --filter @nebula/vega-storage build && pnpm --filter @nebula/vega-storage start
```

## Test

```bash
pnpm --filter @nebula/vega-storage test   # Testcontainers Postgres+MinIO; incl. cross-tenant isolation
```
