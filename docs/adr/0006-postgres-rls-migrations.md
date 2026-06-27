# ADR-0006 · Multi-tenant Postgres: node-pg-migrate + Row-Level Security

- **Status:** Accepted
- **Date:** (F0, Task 5)

## Context

Every tenant-scoped table must isolate orgs (CLAUDE.md hard rule #3). We need
(a) a migration toolchain and (b) an enforcement pattern that cannot be bypassed
by an application bug.

## Decision

**Migrations: `node-pg-migrate`** (raw SQL/JS migrations). Chosen over Prisma
migrate because we need first-class control over RLS policies, `GRANT`s, roles,
and session GUCs — areas where an ORM gets in the way. Migrations live next to
their owner (`services/*/migrations`, `core/*/migrations`); `tools/migrations`
orchestrates running them.

**Isolation: Postgres Row-Level Security**, provided by `@nebula/db`:
- Every tenant table has `org_id uuid not null`.
- `tenantRlsSql(table)` enables **and `FORCE`s** RLS and creates a policy
  `USING/WITH CHECK (org_id = current_setting('app.org_id', true)::uuid)`.
  `FORCE` means even the table owner is subject to the policy.
- The app connects as a **non-superuser** role (superusers bypass RLS).
- `withTenant(pool, orgId, fn)` runs the unit of work in a transaction that first
  sets `app.org_id` via `set_config(..., true)` (transaction-local, so it is safe
  with PgBouncer/transaction pooling). `org_id` comes from the validated JWT
  (`@nebula/nucleo-auth`), never the client.

Defense in depth: `assertOrgAccess` (app layer) sits above RLS (DB layer); either
alone would deny cross-tenant access, but we run both.

## Consequences

- Positive: isolation enforced by the database; a forgotten `WHERE org_id=` in
  app code still cannot leak another org's rows. Toolchain stays close to SQL.
- Negative: must remember to (1) run as a non-superuser role and (2) wrap tenant
  queries in `withTenant`. Both are encapsulated in `@nebula/db` and covered by
  the mandatory cross-tenant isolation test.
- The pooling caveat (`SET LOCAL`/`set_config(...,true)` inside a transaction) is
  required; session-level `SET` would leak across pooled connections.
