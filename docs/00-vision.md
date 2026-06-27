# 00 · Vision

## The problem

The dominant productivity suites (Google Workspace, Microsoft 365) are convenient but come with:

- **Total dependence on a third party**: your data, your availability, and your pricing all depend on an external vendor.
- **No data sovereignty**: you don't control where data lives or who can read it.
- **Per-user costs that scale badly** for SMBs, LATAM teams, or projects with many collaborators.
- **Zero control over encryption**: the vendor holds the keys.

## The proposal

**Nébula** is a productivity suite any organization can **deploy on its own infrastructure** (on-prem or its own cloud), with:

- Drive/OneDrive-style file storage (**Vega**).
- Real-time collaborative editing of documents, spreadsheets, and presentations (**Lyra**, **Orión**, **Aurora**).
- Communication: chat, email, calendar, and video (**Pulsar**, **Iris**, **Cronos**, **Quásar**).
- Unified identity with SSO (**Atlas**) and a single dashboard (**Helios**).
- **End-to-end encryption** where it applies, and **zero plaintext passwords**.
- Everything **dockerized**, orchestrated with **Docker Compose** (dev / small deployments) or **Kubernetes** (production at scale).

## Goals

1. **Sovereignty**: the operator controls data, keys, and availability.
2. **Real modularity**: each app deploys independently; nobody is forced to install all 12.
3. **Multi-tenant**: one instance can serve several isolated organizations.
4. **Secure by default**: encryption at rest and in transit, strong hashing, least privilege, auditing.
5. **Interoperable**: open formats (ODF, Markdown, iCal, JMAP/IMAP, S3) and documented APIs.
6. **Operable by a small team**: one command for dev; reproducible IaC for prod.

## Non-goals (what we will **not** do)

- ❌ **Don't** reinvent Office editing engines from scratch in Phases 1–3. We lean on mature OSS projects (OnlyOffice / Collabora) and build the rest around them. See [ADR-0003](adr/0003-document-editing.md).
- ❌ **Don't** chase niche features on day one. We prioritize the 80% of use cases.
- ❌ **Don't** support "click-and-forget" deployments without infra knowledge in the early phases. The initial audience is technical.
- ❌ **Don't** build native mobile apps until F5+. Apps are responsive/PWA first.

## Architecture principles

| Principle | Practical implication |
|-----------|----------------------|
| **API-first** | Every capability exists as an API before it has a UI. |
| **Stateless where possible** | State lives in Postgres / MinIO / Redis, not in the services. |
| **Open formats** | No lock-in, not even to Nébula itself. |
| **Security as a requirement, not a feature** | Every PR goes through automated security review. |
| **Explicit build vs buy** | Every large component has an ADR justifying build or integrate. |
| **Observability from day 0** | Metrics, logs, and traces before the first user feature. |

## Target audience

- SMBs and startups (especially in LATAM) that don't want to pay per user/month in USD.
- Teams with data-sovereignty requirements (legal, healthcare, government, education).
- Technical organizations that prefer to control their stack.

## North Star metric

> **Active organizations using ≥2 Nébula apps as their primary work tool for ≥4 weeks.**

Measures real adoption, not installs.
