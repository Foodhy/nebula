# Atlas · Identity and SSO

> The Titan who holds up the sky: no other service works without valid identity.

## Responsibility

- User registration, login, and management.
- **SSO** via OIDC/OAuth2 for all Nébula apps.
- Organizations (tenants), roles, and memberships.
- MFA (TOTP + WebAuthn/passkeys).
- Token issuance and rotation (access + refresh).
- Federation with external IdPs (Google, Microsoft, LDAP) — optional per organization.

**Does NOT do:** resource-level authorization (that's `nucleo-policy`). Atlas says *who you are* and *which org you belong to*; fine-grained permissions on a file are decided by the policy layer.

## Implementation base

Built on **Keycloak** (or Authentik). We do not reinvent the IdP. Atlas is Keycloak configured + a thin custom API/UI layer for the Nébula experience and organization management. See [ADR-0004](../adr/0004-identity-keycloak.md).

## Data model (conceptual)

```
Organization (tenant)
  └── Membership (user ⇄ org, with role)
        └── User
              └── Credential (Argon2id hash — managed by Keycloak)
              └── MFADevice
Role: owner | admin | member | guest
```

## Main API

| Verb | Path | What it does |
|------|------|--------------|
| POST | `/auth/register` | Creates a user (+ org if it's the first one). |
| POST | `/auth/login` | Login → tokens (delegated to OIDC). |
| POST | `/auth/refresh` | Renews the access token. |
| POST | `/auth/mfa/enroll` | Registers TOTP/passkey. |
| GET  | `/orgs/:id/members` | Lists members (requires admin). |
| POST | `/orgs/:id/invite` | Invites to the organization. |

## Token (JWT) — claims

```json
{
  "sub": "user-uuid",
  "org_id": "org-uuid",
  "roles": ["member"],
  "scopes": ["vega:read", "vega:write"],
  "exp": 1700000000
}
```

All services validate the signature and **take `org_id` from here**, never from the client.

## Events

- **Publishes:** `user.created`, `user.deactivated`, `org.created`, `membership.changed`.
- **Consumes:** —

## Security

- **Argon2id** hashing; zero plaintext passwords (see `04-security.md`).
- MFA configurable as mandatory per organization.
- Aggressive rate limiting on `/auth/*`.
- Progressive lockout on failed attempts.
- All access events audited → `nucleo-audit`.
