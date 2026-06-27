# 07 · Infrastructure

## Philosophy

> **Compose to develop and to start. Kubernetes when the pain justifies it.**

We don't jump to Kubernetes on day 1. Docker Compose brings up the whole suite on one machine. K8s (starting with **k3s**, lightweight) arrives in F6 when there is a real need for high availability and autoscaling.

## Environments

| Environment | Orchestration | For what |
|-------------|---------------|----------|
| **local / dev** | `infra/compose/dev.yml` | Development. One command brings everything up. |
| **deps-only** | `infra/compose/deps.yml` | Just DB/MinIO/NATS/etc. when running services by hand. |
| **staging** | k3s (or Compose on a VPS) | Pre-production, identical to prod but small. |
| **prod-small** | `infra/compose/prod-small.yml` | Small organizations on a single server. |
| **prod** | Kubernetes + Helm | Production at scale, HA, multi-node. |

## Dependency stack (supporting services)

Brought up by Compose in dev and as charts in prod:

```
PostgreSQL 16     → metadata, permissions (with multi-tenant RLS)
MinIO             → objects / files (S3-compatible, encryption at rest)
Redis 7           → cache, sessions, rate limiting, light queues
NATS (JetStream)  → event bus between services
Meilisearch       → search
Keycloak          → Atlas (identity/SSO)
Vault             → secrets and encryption keys
Traefik           → gateway, TLS, routing
```

## Docker

- **Small images**: multi-stage builds, `distroless`/`alpine` images where possible.
- **Shared base image** in `infra/docker/` to avoid repeating setup.
- **One image per app/service**, tagged `nebula/<id>:<semver>` and `:<git-sha>`.
- Healthchecks on every container.
- Non-root user inside the container.

## Kubernetes (F6)

- **k3s** as the entry point (lightweight control plane, ideal for self-hosters).
- **Helm charts** per app/service in `infra/k8s/charts/`, with per-environment `values`.
- **Ingress** via Traefik.
- **Secrets** from Vault (External Secrets Operator), never in manifests.
- **HPA** (Horizontal Pod Autoscaler) on variable-load services (Vega, Pulsar, Quásar).
- **PodDisruptionBudgets** and ≥2 replicas on critical services to tolerate node failures.
- **Postgres**: an operator (CloudNativePG) for HA and backups.

## Observability (Órbita)

```
Metrics   → Prometheus  → Grafana (per-service dashboards + one global)
Logs      → Loki        → Grafana (correlated with traces)
Traces    → Tempo (OpenTelemetry from each service)
Alerts    → Alertmanager → (Slack/Pulsar/email/PagerDuty)
```

**Rule:** every service exposes `/metrics` (Prometheus) and `/health` from its first commit. Traces use **OpenTelemetry** with a `trace_id` that crosses all services so a request can be followed end to end.

### Initial SLOs (adjust with real data)
- Vega availability (file reads): 99.9%.
- p95 latency to open a file: < 300 ms.
- p95 login latency (Atlas): < 500 ms.

## Backups and disaster recovery (DR)

| What | How | Frequency |
|------|-----|-----------|
| PostgreSQL | Logical dump + WAL archiving (PITR) | Continuous + daily snapshot |
| MinIO | Replication to a secondary bucket / object lock | Continuous |
| Vault | Encrypted Raft snapshots | Daily |
| Configs/IaC | Versioned in Git | On every change |

- **Encrypted backups** before they leave the perimeter.
- **RTO/RPO** defined in F6 and the restore **tested** (a backup that has never been restored doesn't exist).

## CI/CD (GitHub Actions)

Per-PR pipeline:
```
1. install (pnpm + uv, cached)
2. lint + typecheck
3. test (unit + integration of what changed — Turborepo only rebuilds what changed)
4. security (SAST, dep audit, gitleaks, Trivy)
5. build images (on main / tags only)
6. deploy to staging (on main) → prod (on release tag, with approval)
```

- **Per-service deploys**: only what changed gets redeployed.
- **Strategy**: rolling updates; canary for critical services in F6.
- **DB migrations**: versioned, idempotent, applied before the new code (expand/contract for zero-downtime).

## Cost (self-hosted mindset)

- Starting on **a single decent VPS** (Compose) is viable for the first organizations.
- Scale vertically before horizontally while it still makes sense.
- K8s only when the number of organizations/load pays for it.
