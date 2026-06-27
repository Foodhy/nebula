# 05 · Roadmap by phases

Philosophy: **each phase ships something genuinely usable** and reduces the risk of the next one. Phase N+1 is not built until N meets its *exit criteria*.

> Time estimates assume a small team (2–4 people) and exist to order the work, not as a commitment. Adjust to your team's reality.

```
F0 ──▶ F1 ──▶ F2 ──▶ F3 ──▶ F4 ──▶ F5 ──▶ F6
Foundations  MVP   Docs   Office  Comms  RT+   Scale
             Drive +Wiki  Sheets  Mail   Video Hardening
                          Slides  Cal    E2EE
```

---

## F0 · Foundations (infra + identity)
**Goal:** make every future app "just plug in." Without this, nothing else is stable.

**Deliverables**
- Monorepo configured (Turborepo + uv), CI/CD, lint, shared types.
- Base infra: dev Docker Compose (`infra/compose/dev.yml`) with Postgres, Redis, MinIO, NATS, Meilisearch.
- **Atlas** (Keycloak): OIDC, register/login, MFA, organizations, base roles.
- **Núcleo** v0: auth middleware, audit-log, event-bus, feature-flags.
- **Órbita**: Prometheus + Grafana + Loki + Tempo running.
- Traefik gateway with local TLS.
- `@nebula/security`, `@nebula/sdk`, `@nebula/ui` (skeletons).

**Exit criteria**
- A user registers, logs in with MFA, and obtains a valid JWT containing `org_id`.
- Multi-tenant proven: two organizations isolated in Postgres (RLS).
- `docker compose up` brings everything up on a clean machine.
- Security pipeline green.

---

## F1 · MVP — Vega (Drive/OneDrive) + Helios
**Goal:** the first app of real value. Upload, organize, and share files. This alone is sellable.

**Deliverables**
- **Vega**: upload/download, folders, move/rename, trash, **versioning**, **sharing** (links and per-user with `viewer/editor/owner` permissions), file search.
- Encryption at rest in MinIO with a per-organization key.
- **Helios** v1: dashboard, launcher, global search (files only for now), notifications.
- Basic **sync** client (CLI or simple desktop agent) — optional, can slip to F1.5.
- Responsive PWA.

**Exit criteria**
- A team can use Vega as their Drive for a week without losing data.
- Sharing a file between two users respects permissions; a third party without access cannot see it.
- Restoring a previous version works.
- Cross-tenant isolation test green for files.

---

## F2 · Documents + Knowledge — Lyra + Cosmos
**Goal:** create and collaborate, not just store.

**Deliverables**
- **Lyra**: document editor with **real-time collaboration** (Yjs/Tiptap), comments, history, export to Markdown/ODF/PDF. Saves into Vega.
- **Cosmos**: notes and wiki (blocks, internal links, hierarchy), per-organization knowledge base.
- Global search now indexes documents and notes (not just files).
- Consolidated resource-permission layer (evaluate OpenFGA).

**Exit criteria**
- Two people edit the same document in real time with no conflicts or loss.
- A document exports and reopens without losing formatting.

---

## F3 · Full Office — Orión + Aurora
**Goal:** close the Office replacement for 80% of cases.

**Deliverables**
- **Orión** (spreadsheets) and **Aurora** (presentations).
- Decision [ADR-0003](adr/0003-document-editing.md): integrate **OnlyOffice/Collabora** for .xlsx/.pptx compatibility, wrapped in Nébula's UI and saving into Vega.
- Import/export to MS Office formats.

**Exit criteria**
- Open a real `.xlsx` and `.pptx`, edit them, and save without corruption.
- Working co-editing in sheets and slides.

---

## F4 · Communication — Pulsar + Iris + Cronos
**Goal:** make the organization live inside Nébula, not just work on files.

**Deliverables**
- **Pulsar**: real-time chat (channels, DMs, threads, mentions, files via Vega).
- **Iris**: email (integrate **Stalwart** as the server; custom unified-inbox UI).
- **Cronos**: calendar (events, iCal invites, availability), integrated with Iris and Pulsar.
- Unified notifications in Helios.

**Exit criteria**
- Send/receive real external email (inbound and outbound SMTP, SPF/DKIM/DMARC).
- Schedule a meeting that appears on invitees' calendars.
- Chat in real time with presence.

---

## F5 · Advanced real-time — Quásar + E2EE
**Goal:** video calls and strong privacy.

**Deliverables**
- **Quásar**: video calls (integrate **LiveKit**), screen sharing, rooms, calls from Pulsar/Cronos.
- **E2EE** for confidential files and Pulsar DMs (key architecture already seeded in F0).
- Mobile apps (enhanced PWA or native, depending on demand).

**Exit criteria**
- Stable multi-participant video call with screen sharing.
- An E2EE message is not readable in the server's database.

---

## F6 · Scale, hardening, and ecosystem
**Goal:** serious production, multi-org at scale, and extensibility.

**Deliverables**
- Full **Kubernetes** support with Helm charts, autoscaling, high availability.
- **Extension marketplace/SDK**: let third parties build apps on Núcleo and Atlas (MCP/plugins).
- External security audit (pentest), path to SOC 2 / ISO 27001.
- Cost and performance optimization, load testing.
- Documented and tested backups/DR (defined RTO/RPO).

**Exit criteria**
- HA deployment on K8s survives a node failure with no service outage.
- Pentest with no open critical/high findings.
- A third-party extension installs and uses Atlas + Vega via the SDK.

---

## Master table

| Phase | Focus | New apps | Dependencies | Value delivered |
|-------|-------|----------|--------------|-----------------|
| **F0** | Foundations | Atlas, Núcleo, Órbita | — | Platform ready to build on |
| **F1** | MVP Drive | Vega, Helios | F0 | Usable storage (sellable) |
| **F2** | Docs + Wiki | Lyra, Cosmos | F1 (Vega) | Document collaboration |
| **F3** | Office | Orión, Aurora | F2 | Office replacement |
| **F4** | Communication | Pulsar, Iris, Cronos | F0, F1 | The org lives in Nébula |
| **F5** | Real-time | Quásar | F4 | Video + strong privacy |
| **F6** | Scale | — (SDK/marketplace) | All | Serious production + ecosystem |

## How to prioritize within each phase

For each feature, ask:
1. Does it block another app or phase? → it goes first.
2. Is it part of the "80% of cases"? → it goes before the niche.
3. Does it carry high technical risk? → do an early spike to reduce uncertainty.
