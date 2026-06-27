# 06 · Folder structure (monorepo)

N�bula lives in a **single monorepo**. Reasons in [ADR-0001](adr/0001-monorepo-microservices.md): shared types, atomic refactors, one pipeline, coordinated versioning.

## Full tree

```
nebula/
│
├── apps/                          # User apps (frontend + BFF). One folder per app.
│   ├── helios/                    # Dashboard / launcher / global search
│   │   ├── web/                   #   Next.js frontend (PWA)
│   │   ├── bff/                   #   Backend-for-frontend (NestJS)
│   │   └── README.md
│   ├── vega/                      # Drive / OneDrive
│   ├── lyra/                      # Documents
│   ├── orion/                     # Spreadsheets
│   ├── aurora/                    # Presentations
│   ├── cosmos/                    # Notes / wiki
│   ├── pulsar/                    # Chat
│   ├── iris/                      # Email (UI)
│   ├── cronos/                    # Calendar
│   └── quasar/                    # Video
│
├── services/                      # Domain microservices (no UI)
│   ├── vega-storage/              # Files, versions, sharing
│   ├── lyra-collab/               # Collaboration server (Yjs)
│   ├── orion-engine/              # Spreadsheet calculation
│   ├── iris-mail/                 # Mail server integration
│   ├── cronos-cal/                # Events, iCal, availability
│   ├── pulsar-rt/                 # WebSockets / presence
│   └── quasar-media/              # LiveKit orchestration
│
├── core/                          # NÚCLEO — services shared by all apps
│   ├── nucleo-auth/               # JWT validation, middleware, sessions
│   ├── nucleo-search/             # Indexing and search (Meilisearch)
│   ├── nucleo-notifications/      # Notifications (push, email, in-app)
│   ├── nucleo-audit/              # Append-only audit log
│   ├── nucleo-flags/              # Feature flags
│   ├── nucleo-events/             # Shared NATS producers/consumers
│   └── nucleo-policy/             # Central authorization (RBAC/ABAC, OpenFGA)
│
├── packages/                      # Shared TS libraries (internally published)
│   ├── types/                     # @nebula/types — types + Zod schemas
│   ├── sdk/                       # @nebula/sdk — generated API client
│   ├── ui/                        # @nebula/ui — design system, React components
│   ├── security/                  # @nebula/security — hashing, encryption, JWT helpers
│   ├── config/                    # @nebula/config — typed, validated config
│   ├── tsconfig/                  # Shared base tsconfig
│   └── eslint-config/             # Shared lint rules
│
├── libs/                          # Shared Python libraries
│   ├── nebula_security/           # Python equivalent of security
│   ├── nebula_common/             # Utilities, logging, settings (pydantic)
│   └── nebula_events/             # NATS client for Python services
│
├── infra/                         # Infrastructure as code
│   ├── compose/                   # Docker Compose
│   │   ├── dev.yml                #   Full development stack
│   │   ├── deps.yml               #   Dependencies only (DB, MinIO, NATS...)
│   │   └── prod-small.yml         #   Small deployment without K8s
│   ├── docker/                    # Base Dockerfiles / shared images
│   ├── k8s/                       # Manifests / Helm charts
│   │   ├── charts/                #   One chart per app/service
│   │   └── environments/          #   values per environment (staging/prod)
│   ├── terraform/                 # Cloud provisioning (VPC, nodes, DNS, buckets)
│   └── observability/             # Prometheus, Grafana, Loki, Tempo configs
│
├── docs/                          # THIS documentation
│   ├── 00-vision.md
│   ├── 01-naming.md
│   ├── 02-architecture.md
│   ├── 03-tech-stack.md
│   ├── 04-security.md
│   ├── 05-roadmap.md
│   ├── 06-folder-structure.md
│   ├── 07-infrastructure.md
│   ├── 08-testing.md
│   ├── 09-getting-started.md
│   ├── services/                  # One spec per service
│   └── adr/                       # Architecture Decision Records
│
├── tests/                         # Tests that cross services
│   ├── e2e/                       # End-to-end (Playwright)
│   ├── integration/               # Cross-service integration
│   └── load/                      # Load tests (k6)
│
├── tools/                         # Scripts and generators
│   ├── scaffold/                  # Generators for new apps/services
│   ├── migrations/                # DB migration orchestration
│   └── scripts/                   # Misc utilities
│
├── .github/
│   └── workflows/                 # CI/CD (lint, test, build, security, deploy)
│
├── CLAUDE.md                      # Context for Claude Code
├── .env.example
├── package.json                   # Root workspace (pnpm + Turborepo)
├── pnpm-workspace.yaml
├── turbo.json
├── pyproject.toml                 # Python workspace (uv)
└── README.md
```

## Organization rules

| Rule | Why |
|------|-----|
| **`apps/` = what the user sees; `services/` = domain logic; `core/` = shared.** | Separates concerns; avoids coupling UI with domain. |
| An app talks **only** to its BFF; the BFF talks to services and Núcleo. | Keeps the frontend decoupled from internal topology. |
| Shared code **always** in `packages/` (TS) or `libs/` (Py), never copy-pasted. | Single source of truth; refactor in one place. |
| Each `services/*` and `core/*` is **independently deployable and testable**. | Moderate microservices; allows separate scaling. |
| Each app/service folder has its own `README.md`, `Dockerfile`, and `tests/`. | Self-contained and fast onboarding. |
| No secrets in the repo. Only `.env.example`. | Security (see `04-security.md`). |

## Convention inside a service (example: `services/vega-storage/`)

```
vega-storage/
├── src/
│   ├── domain/        # Entities and pure logic (no frameworks)
│   ├── application/   # Use cases (orchestrate the domain)
│   ├── infra/         # Adapters: Postgres, MinIO, NATS
│   ├── api/           # HTTP controllers / handlers
│   └── main.ts        # Bootstrap
├── tests/
│   ├── unit/
│   └── integration/
├── migrations/        # Migrations for its own schema
├── Dockerfile
├── package.json
└── README.md
```

Follows **hexagonal architecture** (domain at the center, infrastructure at the edges) → easy to test and to swap technologies without touching the logic.

## How it's generated

The [`scaffold.sh`](../scaffold.sh) script creates this empty tree with the corresponding `README.md` and `.gitkeep` files, ready to fill in phase by phase.
