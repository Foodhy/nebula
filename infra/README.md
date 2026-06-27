# infra — Nébula infrastructure

Infrastructure-as-code for Nébula: Docker Compose (dev / small deploys), and later
K8s/Helm + Terraform.

## Compose stacks

| File | What | Command |
|------|------|---------|
| `compose/deps.yml` | Dependencies only (DB, cache, storage, bus, search, IdP, gateway) | `docker compose -f infra/compose/deps.yml --env-file .env up -d` |
| `compose/dev.yml` | Full dev stack: `include`s deps, adds Nébula services as built | `docker compose -f infra/compose/dev.yml --env-file .env up -d` |

> Copy `.env.example` → `.env` first. Compose reads values from it.

## Ports (host)

| Service | Port(s) | URL / use |
|---------|---------|-----------|
| Postgres | 5432 | `postgres://nebula:***@localhost:5432/nebula` (+ `keycloak` DB) |
| Redis | 6379 | `redis://localhost:6379` |
| MinIO — S3 API | 9000 | `http://localhost:9000` |
| MinIO — Console | 9001 | `http://localhost:9001` (user/pass = `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY`) |
| NATS — client | 4222 | `nats://localhost:4222` (JetStream) |
| NATS — monitoring | 8222 | `http://localhost:8222/healthz` |
| Meilisearch | 7700 | `http://localhost:7700` (master key = `MEILI_MASTER_KEY`) |
| Keycloak — auth | 8080 | `http://localhost:8080` (admin = `KEYCLOAK_ADMIN`/`KEYCLOAK_ADMIN_PASSWORD`) |
| Keycloak — mgmt | 9002 | `http://localhost:9002/health/ready` (health/metrics) |
| Traefik — web | 80 / 443 | edge entrypoints |
| Traefik — dashboard | 8081 | `http://localhost:8081` (dev only, insecure) |

## Health

All stateful services define healthchecks so dependents can wait on
`condition: service_healthy`. Check status:

```bash
docker compose -f infra/compose/deps.yml ps        # STATUS shows (healthy)
docker compose -f infra/compose/deps.yml logs -f keycloak
```

## Notes

- **Keycloak** runs `start-dev` (NOT for production), uses Postgres (`keycloak` DB,
  created by `compose/initdb/01-keycloak-db.sql`), and auto-imports realms from
  `infra/keycloak/` (`--import-realm`). The `realm-nebula.json` is added in Task 4.
- **Secrets:** dev only via `.env`. Production values come from Vault/SOPS — never commit a real `.env`.
- **Reset everything** (wipes data volumes): `docker compose -f infra/compose/deps.yml down -v`.

## Dev gotchas

- **Keycloak admin console "HTTPS required"** — the `master` realm ships with
  `sslRequired=external`. For local HTTP dev, disable it once after first boot
  (lost only on a `down -v`):
  ```bash
  docker exec nebula-deps-keycloak-1 /opt/keycloak/bin/kcadm.sh config credentials \
    --server http://localhost:8080 --realm master --user admin --password admin
  docker exec nebula-deps-keycloak-1 /opt/keycloak/bin/kcadm.sh update realms/master -s sslRequired=NONE
  ```
- **Atlas BFF (`:4000`) is a JSON API, not a web page** — `/` returns 404 by
  design. Use `/health`, `/metrics`, `/auth/*`. Start it with
  `pnpm --filter @nebula/atlas-bff start` (the deps stack must be up).
- **Meilisearch dashboard (`:7700`)** asks for an admin API key — it is
  `MEILI_MASTER_KEY` from `.env` (dev: `changeme`).
