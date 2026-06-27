# CLAUDE.md

> This file is read automatically by Claude Code. It is the single source of truth for how to work in this repo. Keep it short, current, and accurate.

## What Nébula is

Nébula is a **self-hosted, modular, dockerized productivity suite** — a sovereign alternative to Google Workspace / Microsoft 365. It is **not one app**: it is an ecosystem of independent apps that share identity, storage, search, and notifications through a common core.

Full design lives in [`docs/`](docs/). Read [`docs/02-architecture.md`](docs/02-architecture.md) and [`docs/05-roadmap.md`](docs/05-roadmap.md) before making structural changes.

## The apps (technical IDs)

`atlas` (identity/SSO) · `helios` (dashboard) · `vega` (drive) · `lyra` (docs) · `orion` (sheets) · `aurora` (slides) · `cosmos` (wiki) · `pulsar` (chat) · `iris` (mail) · `cronos` (calendar) · `quasar` (video). Shared: `nucleo-*` (core services), `orbita` (observability).

## Where things live

- `apps/<id>/web` — Next.js frontend (PWA). Talks **only** to its BFF.
- `apps/<id>/bff` — NestJS backend-for-frontend. Talks to services + core.
- `services/<id>` — domain microservices (hexagonal architecture).
- `core/nucleo-*` — shared services (auth, search, notifications, audit, flags, events, policy).
- `packages/*` — shared TS libs (`@nebula/types`, `@nebula/sdk`, `@nebula/ui`, `@nebula/security`, `@nebula/config`).
- `libs/*` — shared Python libs.
- `infra/` — Docker Compose, K8s/Helm, Terraform, observability.
- `docs/` — architecture, ADRs, service specs.

Detailed tree: [`docs/06-folder-structure.md`](docs/06-folder-structure.md).

## Tech stack (don't deviate without an ADR)

- **Frontend:** Next.js 15 + React + TypeScript + Tailwind.
- **TS services / BFF:** NestJS. **Python services:** FastAPI.
- **DB:** PostgreSQL 16 (Row-Level Security for multi-tenancy). **Objects:** MinIO (S3). **Cache/queues:** Redis. **Event bus:** NATS. **Search:** Meilisearch.
- **Identity:** Keycloak (wrapped as Atlas). **Secrets:** Vault.
- **Realtime collab:** Yjs + Tiptap. **Office editing:** OnlyOffice/Collabora (integrate, don't build). **Mail:** Stalwart. **Video:** LiveKit.
- **Monorepo:** pnpm + Turborepo (TS), uv (Python). **Gateway:** Traefik. **Observability:** Prometheus + Grafana + Loki + Tempo.

Rationale + build-vs-buy: [`docs/03-tech-stack.md`](docs/03-tech-stack.md).

## Hard rules (these are non-negotiable)

1. **Never store, log, or transmit passwords in plaintext.** Hashing is **Argon2id**, handled by Atlas/Keycloak. Apps never see passwords — only tokens.
2. **Never trust `org_id` or `user_id` from the client.** Always derive them from the validated JWT (issued by Atlas).
3. **Every data-access feature needs a tenant-isolation test** (org A cannot read org B). This blocks merge. See [`docs/08-testing.md`](docs/08-testing.md).
4. **Don't reinvent crypto.** Use the approved libraries in [`docs/04-security.md`](docs/04-security.md).
5. **Shared code goes in `packages/` or `libs/`, never copy-pasted.**
6. **A frontend talks only to its BFF.** Services don't know who calls them.
7. **No secrets in the repo.** Only `.env.example`. Real values come from Vault/SOPS.

## Coding conventions

- TypeScript strict mode. Validate all external input with **Zod** (TS) / **Pydantic** (Py).
- Services use **hexagonal architecture**: `domain/` (pure) → `application/` (use cases) → `infra/` (adapters) → `api/` (handlers).
- What the user waits for → synchronous HTTP. Side effects (index, notify, audit, thumbnails) → **NATS events**.
- Every service exposes `/health` and `/metrics` from its first commit.
- Conventional Commits (`feat:`, `fix:`, `chore:`...). One logical change per PR.

## Common commands

```bash
./scaffold.sh                                  # generate the empty monorepo tree
cp .env.example .env                           # set up env
docker compose -f infra/compose/deps.yml up    # start dependencies only (DB, MinIO, NATS...)
docker compose -f infra/compose/dev.yml up     # start the full dev stack (once apps exist)
pnpm install && pnpm turbo run build           # install + build all TS
pnpm turbo run test                            # run tests (only what changed)
```

## Current phase

**F0 — Foundations.** We are building the monorepo skeleton, infra (Compose deps), Atlas (identity), Núcleo v0, and the testing harness. Do **not** start user-facing apps until F0 exit criteria pass.

Start here: [`docs/09-getting-started.md`](docs/09-getting-started.md) — it has the concrete, ordered F0 task list designed to be executed with Claude Code.

## When in doubt

- Structural/architectural decision → write or update an ADR in `docs/adr/` before coding.
- Security-sensitive change → re-read [`docs/04-security.md`](docs/04-security.md) and add tests.
- New service → copy the structure convention from [`docs/06-folder-structure.md`](docs/06-folder-structure.md) and add a spec in `docs/services/`.
