# ADR-0001 · Monorepo + moderate microservices

- **Status:** Accepted
- **Date:** (project start)

## Context
N�bula will have ~12 apps and several shared services that evolve together and share types, SDK, and design system.

## Options considered
1. **Polyrepo** (one repo per app/service) — isolates well, but cross-service refactors are painful, shared types drift, and there are N pipelines to maintain.
2. **Single monolith** — simple at first, but prevents scaling/deploying apps separately and couples everything.
3. **Monorepo + moderate microservices** — one repo, several deployments. One service per *business capability*, not per entity.

## Decision
Option 3. Monorepo with Turborepo (TS) + uv (Python). Moderate services: we group by capability (e.g., `vega-storage` covers files+versions+sharing) instead of tiny microservices.

## Consequences
- Positive: shared types and SDK without drift; atomic refactors; one pipeline with incremental cache; independent per-service deploys.
- Negative: the repo grows; requires discipline on package boundaries; monorepo tooling to learn.
- Mitigation: boundaries enforced by lint (don't import another service's domain directly); Turborepo only rebuilds what changed.
