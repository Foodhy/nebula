# ADR-0002 · MinIO (objects) + PostgreSQL (metadata) for Vega

- **Status:** Accepted
- **Date:** (before F1)

## Context
Vega needs to store files (large bytes) and their metadata/permissions/versions, while staying multi-tenant and encrypted at rest, all self-hosted.

## Options considered
1. **Everything in the database** (BLOBs in Postgres) — simple but scales terribly for large files and makes the DB expensive.
2. **Host filesystem** — fragile, hard to replicate/encrypt/scale and to operate multi-node.
3. **MinIO (S3-compatible) for objects + Postgres for metadata** — separates concerns; standard S3 API; native encryption at rest.

## Decision
Option 3. Bytes in **MinIO** (bucket per organization, SSE with Vault-managed keys). Metadata, permissions, and versions in **PostgreSQL** with Row-Level Security by `org_id`.

## Consequences
- Positive: scales for large files; presigned multipart uploads that bypass the backend; standard S3 API (portable to real S3 if desired); per-tenant encryption.
- Negative: two systems to operate and back up; eventual consistency between "object uploaded" and "metadata recorded" to handle.
- Exit plan: being a standard S3 API, migrating to another S3 provider is straightforward.
