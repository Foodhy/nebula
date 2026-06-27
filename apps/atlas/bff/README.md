# atlas-bff · Identity BFF

Thin NestJS backend-for-frontend over **Keycloak** (the IdP engine, ADR-0004).
Atlas says *who you are* and *which org you belong to*; resource permissions are
`nucleo-policy`'s job.

## Endpoints

| Verb | Path | Auth | What |
|------|------|------|------|
| POST | `/auth/register` | public | Create an org (Keycloak group) + its owner user. |
| POST | `/auth/login` | public | Password grant → tokens. |
| POST | `/auth/refresh` | public | Refresh grant → tokens. |
| GET | `/orgs/:id/members` | JWT | List org members (caller's org only). |
| POST | `/orgs/:id/invite` | JWT | Invite a user into the caller's org. |
| GET | `/health` | public | Liveness. |

The `:id` in `/orgs/*` is checked against the `org_id` from the validated JWT
(`assertOrgAccess`) — a token for org A cannot act on org B.

## Tenant model (ADR-0005)

Groups-in-one-realm: each org is a Keycloak **group**; the group id is the
`org_id`. A user carries `org_id` as an attribute, mapped into the token by the
`nebula-apps` client. Realm roles `owner/admin/member/guest` map to the `roles`
claim. Passwords are hashed with **Argon2id** (`passwordPolicy hashAlgorithm(argon2)`).

## Swappable IdP

All Keycloak calls sit behind `IdentityProvider` (`KeycloakHttpAdapter`). Apps
speak standard OIDC; only this adapter knows Keycloak (ADR-0004 exit plan).

## MFA (status)

TOTP is enabled at the realm (`otpPolicy=totp`, `CONFIGURE_TOTP` action available)
and can be made **mandatory per org** by attaching the required action. A
dedicated `/auth/mfa/enroll` UX is deferred beyond F0.

## Run

```bash
# deps stack (incl. Keycloak with the nebula realm imported) must be up:
docker compose -f infra/compose/deps.yml --env-file .env up -d
pnpm --filter @nebula/atlas-bff build && pnpm --filter @nebula/atlas-bff start
```

## Test

```bash
pnpm --filter @nebula/atlas-bff test   # integration: register→login→JWT(org_id), cross-tenant denial
```
