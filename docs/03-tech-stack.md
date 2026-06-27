# 03 · Tech stack

The stack is chosen so a team strong in **TypeScript** and **Python** is productive from day 1, with no exotic technologies slowing delivery.

## Summary by layer

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 15 + React + TypeScript + Tailwind | SSR/PWA, huge ecosystem, native TS. |
| **Shared UI** | Custom components + Radix UI / shadcn | Consistency across all 12 apps from a single package. |
| **Collaborative editor** | Yjs (CRDT) + Tiptap / ProseMirror | The de-facto standard for real-time collaboration. |
| **BFF / TS services** | NestJS | Opinionated structure, DI, modules, end-to-end TS. |
| **Python services** | FastAPI | For ML/processing services (OCR, indexing, conversion). |
| **API Gateway** | Traefik | Container auto-discovery, automatic TLS, simple. |
| **Identity / SSO** | Keycloak *(or Authentik)* | Mature OIDC/OAuth2, MFA, federation. Don't reinvent auth. |
| **Database** | PostgreSQL 16 | Solid relational, RLS for multi-tenancy, JSONB, full-text. |
| **Object storage** | MinIO (S3-compatible) | Self-hosted, standard S3 API, encryption at rest. |
| **Cache / light queues** | Redis | Sessions, rate limiting, jobs. |
| **Event bus** | NATS (JetStream) | Lightweight, fast, optional persistence. |
| **Search** | Meilisearch | Fast, easy to operate, per-tenant multi-index. |
| **Secrets** | HashiCorp Vault *(or SOPS to start)* | Key/secret management, rotation. |
| **Email (server)** | Stalwart Mail Server | Modern JMAP + IMAP + SMTP in a single binary. |
| **Video (SFU)** | LiveKit | Self-hosted WebRTC SFU, scalable. |
| **Office editors** | OnlyOffice Docs *(or Collabora)* | See [ADR-0003](adr/0003-document-editing.md). |
| **Orchestration (dev)** | Docker Compose | One command to bring everything up locally. |
| **Orchestration (prod)** | Kubernetes (k3s to start) | Horizontal scale; k3s lowers initial complexity. |
| **IaC** | Terraform + Helm | Reproducible, versioned infrastructure. |
| **CI/CD** | GitHub Actions | Already in the team's ecosystem. |
| **Observability** | Prometheus · Grafana · Loki · Tempo | Metrics, logs, and traces, all OSS. |

## Monorepo and tooling

- **TS manager:** pnpm + **Turborepo** (build cache, parallel tasks).
- **Python manager:** **uv** (workspaces, fast).
- **Lint/format:** Biome (or ESLint+Prettier) for TS, Ruff for Python.
- **Shared types:** a `@nebula/types` package + **Zod** schemas that generate types and runtime validation.
- **API contracts:** OpenAPI generated from code; SDK clients auto-generated in `@nebula/sdk`.

## Build vs Buy — the rule

> **We build what is our differentiator (the integration, the unified experience, sharing, multi-tenancy). We integrate what is a solved problem (auth, Office editing, email transport, WebRTC).**

| Component | Decision | Reason |
|-----------|----------|--------|
| Identity/SSO | **Buy/integrate** (Keycloak) | Auth done wrong = a breach. Keycloak is battle-tested. |
| Word/Excel/PPT editors | **Buy/integrate** (OnlyOffice) | Building an Office-compatible editor takes years. |
| Storage (Vega) | **Build** on MinIO | Sharing, versioning, and permissions *are* the product. |
| Real-time collaboration | **Build** on Yjs | Part of the differential experience. |
| Mail server | **Buy/integrate** (Stalwart) | SMTP/IMAP transport is complex and solved. |
| Mail client (Iris UI) | **Build** | The unified-inbox experience is ours. |
| Video SFU | **Buy/integrate** (LiveKit) | WebRTC at scale is very hard to build. |
| Dashboard/launcher (Helios) | **Build** | It's the glue of the whole suite. |

Each "buy/integrate" has an ADR documenting the decision and its exit plan (how to migrate if the integrated project dies).

## Target versions (at design time)

> ⚠️ Verify current LTS/stable versions when starting each phase; these are reference, not fixed.

- Node.js 22 LTS · pnpm 9 · TypeScript 5.x
- Python 3.12 · uv
- PostgreSQL 16 · Redis 7 · MinIO (stable release)
- Kubernetes 1.30+ / k3s

## What we do NOT use (and why)

- **Mongo as the primary database** → we prefer Postgres (relations, RLS, strong transactions for permissions).
- **Kafka** → NATS covers our needs with far less operational overhead.
- **Microservices per entity** → over-engineering; see ADR-0001.
- **Building our own IdP** → unnecessary security risk.
