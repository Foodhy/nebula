# @nebula/db

Multi-tenant Postgres baseline: Row-Level Security helpers + per-request tenant
scoping + the migration convention. See [ADR-0006](../../docs/adr/0006-postgres-rls-migrations.md).

## Pattern for a tenant-scoped table

1. Migration creates the table with an `org_id uuid NOT NULL` column, then applies RLS:

   ```js
   // services/<svc>/migrations/<ts>_files.cjs
   const { tenantRlsSql } = require('@nebula/db'); // or inline the SQL
   exports.up = (pgm) => {
     pgm.sql(`CREATE TABLE files (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
       org_id uuid NOT NULL,
       name text NOT NULL
     );`);
     pgm.sql(tenantRlsSql('files'));
     pgm.sql('GRANT SELECT, INSERT, UPDATE, DELETE ON files TO nebula_app;');
   };
   ```

2. The service connects as the **non-superuser** role `nebula_app` (superusers
   bypass RLS).

3. Every tenant query runs inside `withTenant`, which sets `app.org_id` for the
   transaction. `orgId` comes from the validated JWT (`@nebula/nucleo-auth`):

   ```ts
   import { withTenant } from '@nebula/db';
   const files = await withTenant(pool, ctx.orgId, (c) =>
     c.query('SELECT * FROM files').then((r) => r.rows),
   );
   ```

RLS then guarantees isolation even if app code forgets a `WHERE org_id =` clause.
`assertOrgAccess` (app layer) is the second line of defense.

## Migrations

`node-pg-migrate` (ADR-0006). Run against a DB:

```bash
DATABASE_URL=postgres://nebula:changeme@localhost:5432/nebula \
  pnpm --filter @nebula/db migrate up
```

## Test

```bash
pnpm --filter @nebula/db test   # Testcontainers: cross-tenant isolation as a non-superuser role
```
