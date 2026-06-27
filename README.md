# Nébula

> A **self-hosted, modular, dockerized productivity suite** — a sovereign alternative to Google Workspace / Microsoft 365 that your organization deploys and fully controls.

Nébula is not a single application: it is an **ecosystem of independent apps** that share identity, storage, search, and notifications through a common core. Each app can be deployed alone or as part of the suite.

---

## The applications

| App | Replaces | What it does | Phase |
|-----|----------|--------------|-------|
| **Atlas** | Google Admin / Entra ID | Identity, SSO (OIDC), users, organizations, roles, audit | F0 |
| **Helios** | Workspace launcher | Central dashboard, app launcher, global search, notifications | F1 |
| **Vega** | Drive / OneDrive | File storage, sync, versioning, and sharing | F1 |
| **Lyra** | Docs / Word | Real-time collaborative document editor | F2 |
| **Orión** | Sheets / Excel | Spreadsheets | F3 |
| **Aurora** | Slides / PowerPoint | Presentations | F3 |
| **Cosmos** | Notion / Confluence | Notes, wiki, knowledge base | F2 |
| **Pulsar** | Slack / Teams | Real-time chat and messaging | F4 |
| **Iris** | Gmail / Outlook | Email | F4 |
| **Cronos** | Calendar | Calendar and scheduling | F4 |
| **Quásar** | Meet / Zoom | Video calls and conferencing | F5 |
| **Núcleo** | (infra) | Shared services: auth tokens, search, notifications, audit log, feature flags, event bus | F0 |
| **Órbita** | (infra) | Observability: metrics, logs, traces, alerts | F0 |

> The naming theme is **astronomical**: the suite is a *nebula* (the cloud stars are born from), and each app is a star or celestial body. See [`docs/01-naming.md`](docs/01-naming.md) for the full rationale and alternatives.

---

## Documentation index

1. [Vision, goals, and non-goals](docs/00-vision.md)
2. [Naming and branding](docs/01-naming.md)
3. [Architecture](docs/02-architecture.md)
4. [Tech stack and build-vs-buy decisions](docs/03-tech-stack.md)
5. [Security](docs/04-security.md)
6. [Roadmap by phases (F0–F6)](docs/05-roadmap.md)
7. [Monorepo folder structure](docs/06-folder-structure.md)
8. [Infrastructure (Docker / Kubernetes / observability)](docs/07-infrastructure.md)
9. [Testing strategy](docs/08-testing.md)
10. [**Getting started with Claude Code (F0 task plan)**](docs/09-getting-started.md)
11. Per-service specs → [`docs/services/`](docs/services/)
12. Architecture Decision Records → [`docs/adr/`](docs/adr/)

Also see [`CLAUDE.md`](CLAUDE.md) — the context file Claude Code reads automatically.

## Quick start

```bash
# 1. Generate the real monorepo structure from this documentation
./scaffold.sh

# 2. Copy environment variables
cp .env.example .env

# 3. Start dependencies (DB, MinIO, NATS, Meilisearch, Keycloak...)
docker compose -f infra/compose/deps.yml up

# 4. Open Claude Code in this folder and follow docs/09-getting-started.md
```

## Status

📐 **Architecture phase, entering F0.** This repository contains the complete design. Code is built following the [roadmap](docs/05-roadmap.md), phase by phase, starting with **Núcleo + Atlas + Vega** (the MVP). Begin with [`docs/09-getting-started.md`](docs/09-getting-started.md).
