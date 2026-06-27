# ADR-0005 · Keycloak tenants as groups in one realm

- **Status:** Accepted
- **Date:** (F0, Task 4)

## Context

Atlas (on Keycloak, per ADR-0004) must model **organizations (tenants)** so that
every issued JWT carries an `org_id` claim. Two shapes are possible.

## Options considered

1. **Realm per tenant** — strongest IdP-level isolation, but N issuers/JWKS, heavy
   ops, and cross-app SSO becomes awkward. Justified only for a few large/regulated
   tenants.
2. **Groups in one realm** — a single `nebula` realm; each org is a Keycloak group;
   the user's active `org_id` is carried as a user attribute mapped into the token.
   One issuer/JWKS, simplest SSO, fits many SMB tenants. Isolation is enforced in
   depth by the app layer (`assertOrgAccess`) and Postgres RLS (ADR-0006), not by
   the IdP alone.

## Decision

**Option 2 — groups in one realm.** The `nebula` realm contains:
- Realm roles `owner/admin/member/guest`.
- Password hashing **Argon2** (Keycloak ≥24 default; pinned via `passwordPolicy hashAlgorithm(argon2)`).
- TOTP available (mandatory-per-org configurable later).
- Client `nebula-apps` with protocol mappers that emit:
  - `org_id` from the user attribute `org_id`,
  - `roles` from realm roles.

Atlas creates one Keycloak **group per org** (the org entity) and sets the joining
user's `org_id` attribute. The realm is reproducible via `--import-realm`
(`infra/keycloak/realm-nebula.json`), never click-ops.

## Consequences

- Positive: one issuer/JWKS for all apps; cheap to add tenants; standard OIDC.
- Negative: tenant isolation depends on app + DB enforcement (must be tested — the
  cross-tenant isolation test is mandatory and blocks merge).
- Multi-org-per-user is out of scope for F0 (one active `org_id` per token). If
  needed later, switch the mapper to a per-request org selection without changing
  the realm topology.
- Exit plan unchanged from ADR-0004: apps speak standard OIDC; only Atlas knows Keycloak.
