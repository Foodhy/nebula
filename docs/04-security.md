# 04 · Security

> Explicit project requirement: **never pass or store passwords in plaintext**, and rely on **proven security libraries** instead of homemade cryptography.

Rule number one: **we do not invent cryptography.** We use audited primitives and libraries.

## Passwords and credentials

- **Hashing:** `Argon2id` (parameters: memory ≥ 19 MiB, iterations ≥ 2, parallelism per CPU). Fall back to `bcrypt` only if the environment requires it.
- **Never** store, log, or transmit a password in cleartext. Not in logs, not in traces, not in error messages.
- Authentication is centralized in **Atlas/Keycloak** → apps **never** see the password; they receive tokens.
- **MFA** (TOTP + WebAuthn/passkeys) available from F0, configurable as mandatory per organization.
- Rotation and minimum-length policy configurable per tenant.

## Libraries per language (don't reinvent)

| Need | TypeScript/Node | Python |
|------|------------------|--------|
| Password hashing | `@node-rs/argon2` | `argon2-cffi` |
| Symmetric/asymmetric encryption | `libsodium-wrappers` (NaCl) | `pynacl` / `cryptography` |
| JWT / JWE | `jose` | `pyjwt` / `authlib` |
| Input validation | `zod` | `pydantic` |
| HTML sanitization | `dompurify` | `bleach` |
| OAuth2/OIDC client | `openid-client` | `authlib` |
| Rate limiting | `rate-limiter-flexible` | `slowapi` |
| Secrets | Vault SDK | Vault SDK |

## Encryption

### In transit
- **TLS 1.3** at the entire edge (Traefik manages certificates via ACME/Let's Encrypt or an internal CA).
- Optional mTLS between internal services in production (service mesh or Núcleo-issued certs).

### At rest
- **Objects (Vega/MinIO):** SSE (Server-Side Encryption) with keys managed by Vault. One **data key per organization**, wrapped (envelope encryption) by a master key.
- **Database:** volume encryption + field-level encryption for sensitive data (third-party tokens, integration secrets) using `libsodium`.
- **Backups:** encrypted before leaving the perimeter.

### End-to-end (E2EE) — where it applies
- For files marked "confidential" and for 1:1 messages in Pulsar, an **E2EE** option: the server only sees ciphertext. Keys derive from the user (not recoverable by the operator → a trade-off documented for the user).
- F5+: it does not block the MVP, but the key architecture is designed from F0 to avoid a rewrite later.

## Threat model (STRIDE summary)

| Threat | Mitigation |
|--------|------------|
| **Spoofing** | OIDC + MFA, signed JWTs, never trusting `org_id`/`user_id` from the client. |
| **Tampering** | Token signatures, object checksums, RLS in Postgres. |
| **Repudiation** | Immutable `audit-log` in Núcleo (append-only): who/what/when. |
| **Information disclosure** | Encryption at rest/in transit, per-tenant isolation, least privilege. |
| **Denial of service** | Rate limiting at gateway and per user, per-tenant quotas, timeouts. |
| **Elevation of privilege** | RBAC/ABAC validated in every service, JWT scopes, permission review. |

## Authorization (RBAC + ABAC)

- **Base RBAC:** per-organization roles (`owner`, `admin`, `member`, `guest`).
- **ABAC for resources:** permissions on files/folders (`viewer`, `commenter`, `editor`, `owner`) that can be delegated and inherited by folder.
- The authorization decision lives in a central layer (`@nebula/security` + a policy service) so logic isn't duplicated in each app.
- Evaluate **OpenFGA / Cedar** for complex relationship-based permissions (Google Zanzibar style) starting in F2.

## Multi-tenant: isolation

- Every record carries `org_id`; Postgres enforces **Row-Level Security**.
- Buckets, search indexes, and encryption keys separated per organization.
- A service **never** accepts the client's `org_id`; it takes it from the validated JWT.

## Security in the development lifecycle (DevSecOps)

On every PR, the pipeline runs:
- **SAST**: static analysis (CodeQL / Semgrep).
- **Dependencies**: `pnpm audit`, `pip-audit`, Dependabot/Renovate.
- **Secrets**: gitleaks (no committed credentials).
- **Containers**: image scanning (Trivy).
- **IaC**: Terraform/Helm scanning (Checkov).
- **Security tests**: authorization cases (a user cannot read another tenant's data) are mandatory.

## Compliance (future goal)

Design from the start to make these easier later:
- **GDPR / Habeas Data (Colombia, Law 1581)**: per-user data export and deletion, consent logging.
- **SOC 2 / ISO 27001**: the `audit-log`, access control, and observability lay the groundwork.

## Minimum checklist before going to production

- [ ] TLS 1.3 enforced, HSTS enabled.
- [ ] Argon2id confirmed in Atlas, zero passwords in logs.
- [ ] RLS enabled and tested in Postgres.
- [ ] Encryption at rest enabled in MinIO and the DB.
- [ ] Secrets only in Vault/SOPS, never in a committed `.env`.
- [ ] Rate limiting at the gateway.
- [ ] Backups encrypted and restore tested.
- [ ] Pipeline scans green.
- [ ] Cross-tenant isolation test green.
