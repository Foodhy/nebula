# 09 · Getting started with Claude Code

This is the practical kickoff. It turns the design in `docs/` into an **ordered list of tasks you can hand to Claude Code one at a time**. Don't try to build everything at once — each task is scoped to be a single focused Claude Code session with clear acceptance criteria.

## Before you start

```bash
# 1. Generate the empty monorepo tree
./scaffold.sh

# 2. Set up env (dev values only)
cp .env.example .env

# 3. Start dependencies (you'll need Docker)
docker compose -f infra/compose/deps.yml up -d   # created in Task 2 below
```

Open Claude Code **in the repo root** so it reads `CLAUDE.md` automatically. That file already encodes the hard rules — Claude Code will follow them.

## How to drive Claude Code through this

- Work **one task at a time, in order**. Each builds on the previous.
- Paste the task's prompt, let it work, then verify the **acceptance criteria** before moving on.
- After each task: review the diff, run the tests, commit. Small commits.
- If Claude Code drifts from the architecture, point it back to the relevant doc (`docs/02-architecture.md`, `docs/04-security.md`, etc.).

---

## Phase 0 task list

### Task 0 — Initialize the workspace
**Prompt to Claude Code:**
> Set up the root monorepo tooling: `package.json` with pnpm workspaces, `pnpm-workspace.yaml`, `turbo.json`, root `tsconfig` base in `packages/tsconfig`, Biome (or ESLint+Prettier) config, and `pyproject.toml` with uv workspaces for `libs/`. Add root scripts: `build`, `test`, `lint`, `typecheck` wired through Turborepo. Don't add app code yet.

**Acceptance:** `pnpm install` succeeds; `pnpm turbo run lint` runs (even with nothing to lint); the Python workspace resolves with `uv sync`.

---

### Task 1 — Shared foundation packages
**Prompt:**
> Implement the skeletons of `packages/types` (export shared TS types + a few base Zod schemas like `OrgId`, `UserId`, `Permission`), `packages/config` (typed env loading validated with Zod), and `packages/security` (Argon2id hash/verify wrappers via `@node-rs/argon2`, JWT verify helpers via `jose`, and an `assertOrgAccess(jwtOrgId, resourceOrgId)` guard). Write unit tests for `packages/security` — including a test proving a wrong `org_id` is rejected.

**Acceptance:** `packages/security` has passing unit tests; hashing uses Argon2id; no plaintext anywhere; `@nebula/config` fails loudly on a missing required env var.

---

### Task 2 — Dependency stack (Docker Compose)
**Prompt:**
> Create `infra/compose/deps.yml` with Postgres 16, Redis 7, MinIO, NATS (JetStream), Meilisearch, Keycloak, and Traefik. Use the variables from `.env.example`. Add healthchecks and a shared network. Create `infra/compose/dev.yml` that extends deps and will later add our services. Document the ports in `infra/README.md`.

**Acceptance:** `docker compose -f infra/compose/deps.yml up -d` brings all dependencies up healthy; MinIO console, Keycloak admin, and Meilisearch are reachable locally.

---

### Task 3 — Núcleo: auth middleware + audit + events
**Prompt:**
> Build `core/nucleo-auth` (NestJS): a reusable module that validates a Keycloak-issued JWT, extracts `sub`, `org_id`, `roles`, `scopes`, and exposes a guard. It must NEVER read `org_id` from the request body/headers. Build `core/nucleo-events` (a thin NATS client wrapper for publish/subscribe with typed payloads from `@nebula/types`). Build `core/nucleo-audit` (append-only audit log persisted to Postgres). Hexagonal structure. Unit + integration tests with Testcontainers.

**Acceptance:** a request with a forged `org_id` in the body is ignored in favor of the JWT's; audit entries are append-only; integration tests pass against real Postgres/NATS via Testcontainers.

---

### Task 4 — Atlas: identity on Keycloak
**Prompt:**
> Configure Keycloak as Atlas: a `nebula` realm, an `nebula-apps` OIDC client, organizations modeled as Keycloak groups (or realm-per-tenant — propose the trade-off first), base roles `owner/admin/member/guest`, Argon2id as the password hashing algorithm, and TOTP MFA enabled. Build a thin `apps/atlas/bff` (NestJS) exposing register/login/refresh/invite endpoints that delegate to Keycloak, plus org membership management. Write the cross-tenant isolation test scaffold here (it will be reused everywhere).

**Acceptance:** a user can register, log in (with MFA), and receive a JWT containing `org_id`; passwords are Argon2id in Keycloak; two orgs exist and are distinct. See `docs/services/atlas.md`.

---

### Task 5 — Multi-tenant Postgres baseline
**Prompt:**
> Establish the multi-tenant Postgres convention: a migration toolchain (e.g., node-pg-migrate or Prisma migrate — propose one), a base pattern where every tenant-scoped table has `org_id` and Row-Level Security policies, and a helper in `packages/config`/`core` that sets the current `org_id` per request/connection. Write an integration test proving org A cannot read org B's rows even with a crafted query through the app layer.

**Acceptance:** RLS is enforced; the cross-tenant isolation integration test passes; the pattern is documented for reuse by future services.

---

### Task 6 — Observability (Órbita) + health/metrics conventions
**Prompt:**
> Add `infra/observability/` with Prometheus, Grafana, Loki, and Tempo configs, wired into `infra/compose/dev.yml`. Add a shared NestJS module (and Python equivalent in `libs/nebula_common`) that exposes `/health` and `/metrics` and emits OpenTelemetry traces with a propagated `trace_id`. Make `nucleo-auth`/`nucleo-audit` use it.

**Acceptance:** Grafana shows metrics from at least one Núcleo service; a request produces a trace visible in Tempo; every service has `/health` and `/metrics`.

---

### Task 7 — CI/CD + security pipeline
**Prompt:**
> Create `.github/workflows/ci.yml`: install (pnpm+uv cached), lint, typecheck, run affected tests via Turborepo, and a security stage (gitleaks, `pnpm audit`/`pip-audit`, Semgrep or CodeQL, Trivy on built images). Block the merge if the cross-tenant isolation tests or security stage fail.

**Acceptance:** opening a PR runs the full pipeline; a committed fake secret is caught by gitleaks; the isolation tests run in CI.

---

## F0 exit checklist (gate to F1)

Do not start Vega/Helios until all of these are true:

- [ ] `docker compose -f infra/compose/dev.yml up` works on a clean machine.
- [ ] A user registers → logs in with MFA → gets a valid JWT with `org_id`.
- [ ] Two organizations are isolated in Postgres (RLS), proven by a passing test.
- [ ] Argon2id confirmed; zero passwords in logs.
- [ ] Every Núcleo service exposes `/health` and `/metrics`; traces visible in Tempo.
- [ ] CI pipeline (lint, typecheck, tests, security) is green on `main`.

## What comes after F0

When the checklist passes, move to **F1 (Vega + Helios)**. The first task there:

> Build `services/vega-storage` per `docs/services/vega.md`: file upload (multipart via MinIO presigned URLs), folders, versioning, and sharing with `viewer/editor/owner` permissions enforced through `nucleo-policy`. Encryption at rest with a per-org key. Include the mandatory cross-tenant isolation test for files.

Then `apps/vega` (Next.js UI) and `apps/helios` (dashboard). Follow `docs/05-roadmap.md` from there.

---

### Tips for working with Claude Code on this project

- Keep `CLAUDE.md` updated as conventions solidify — it's the steering wheel.
- Prefer asking Claude Code to **write the test first** for anything touching permissions or tenancy.
- For each new service, tell it to **read `docs/06-folder-structure.md`** and follow the hexagonal convention.
- When integrating a third party (Keycloak, OnlyOffice, Stalwart, LiveKit), ask it to **isolate the integration behind an interface** so it's swappable (the ADRs require an exit plan).
