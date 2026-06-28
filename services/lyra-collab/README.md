# lyra-collab · Real-time document collaboration

F2 backend. Yjs (CRDT) collaboration over WebSocket, persisted to Postgres
(tenant-isolated by RLS), with snapshots saved into Vega. See
[ADR-0006](../../docs/adr/0006-postgres-rls-migrations.md).

## Endpoints

| Kind | Path | Notes |
|------|------|-------|
| WS | `/collab?doc=<id>&token=<jwt>` | Yjs sync + awareness; token verified (Keycloak JWKS), doc must belong to the token's org |
| HTTP POST | `/docs` `{title}` | create a document |
| HTTP GET | `/docs/:id` | document metadata |
| HTTP POST | `/docs/:id/snapshot` | render current text → save as a Markdown file in Vega (caller's bearer); records `vega_file_id` |
| HTTP GET | `/health` · `/metrics` | liveness + Prometheus |

## How it works

- `lyra_docs` + `lyra_updates` (Yjs update log), both `org_id` + RLS; the service
  connects as `nebula_app` and scopes every query with `withTenant` (`@nebula/db`).
- A WS connection joins a room (per `org:doc`); the room's `Y.Doc` is rebuilt from
  the stored update log. Client edits are applied via the y-protocols sync
  protocol, persisted (org-scoped), and broadcast to other clients. Presence via
  y-protocols awareness.
- Snapshot encodes the doc text and uploads it to Vega via `vega-storage` using
  the caller's token (same org/permission enforcement).

## Migrations

Uses its own migrations table (the DB is shared across services):

```bash
DATABASE_URL=postgres://nebula:changeme@localhost:5432/nebula \
  pnpm --filter @nebula/lyra-collab migrate up
```

## Test

```bash
pnpm --filter @nebula/lyra-collab test   # Testcontainers: Yjs convergence + RLS isolation
```
