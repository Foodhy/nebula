# 08 · Testing strategy

> Explicit project requirement: **lots of tests**. Testing is not optional and not left "for later": it is part of the definition of done.

## The pyramid

```
            ╱╲
           ╱E2E╲           Few. Critical end-to-end flows (Playwright).
          ╱──────╲
         ╱ Integr. ╲       Some. Service + its real dependencies (DB, MinIO).
        ╱────────────╲
       ╱     Unit      ╲    Many. Pure domain logic, fast.
      ╱──────────────────╲
```

Lower = more of them, faster, cheaper. We invest in the base first.

## Test types

| Type | What it tests | Tool | Where it lives |
|------|--------------|------|----------------|
| **Unit** | Domain logic, no frameworks or network | Vitest (TS) · pytest (Py) | each service's `src/` |
| **Integration** | Service with real DB/MinIO/NATS (Testcontainers) | Vitest/pytest + Testcontainers | `tests/integration/` per service |
| **Contract** | APIs honor their OpenAPI; client and server agree | Schemathesis / contract tests | per service |
| **E2E** | Full flows in a browser | Playwright | `tests/e2e/` |
| **Load** | Performance under stress | k6 | `tests/load/` |
| **Security** | Authorization, isolation, hashing | Vitest/pytest + dedicated cases | per service + `tests/` |

## Mandatory security/multi-tenant tests

These are **non-negotiable** and block the merge:

1. **Cross-tenant isolation**: a user from organization A **cannot** read, list, or modify organization B's resources (tested directly via API, not through the UI).
2. **Resource authorization**: a `viewer` cannot edit; someone without permission cannot access.
3. **No plaintext passwords**: the DB hash is Argon2id; logs contain no credentials.
4. **`org_id` is never trusted from the client**: forcing another `org_id` in the body/headers is rejected.

## Coverage targets

| Layer | Minimum coverage |
|-------|------------------|
| Domain (`domain/`, `application/`) | **90%** — it's the critical logic |
| Full services | **80%** |
| Authorization/security cases | **100% of the defined paths** |

Coverage is a signal, not the goal. 80% with meaningful tests > 95% with trivial ones.

## Test data

- **Testcontainers** for real Postgres/MinIO/NATS in CI → faithful integration, no brittle infra mocks.
- **Factories** (not giant fixtures) to generate test entities.
- **Reproducible seeds** per tenant for E2E.

## In the pipeline

```
PR opened
  └─ Turborepo detects what changed
       └─ runs ONLY the affected tests (fast)
  └─ lint + typecheck
  └─ security/isolation tests (always)
merge to main
  └─ full suite (unit + integration + E2E)
release (tag)
  └─ + load tests against staging
```

## Definition of Done

A feature is done when:
- [ ] It has unit tests for its domain logic.
- [ ] It has integration tests if it touches DB/storage/events.
- [ ] If it affects data access: it has a cross-tenant isolation test.
- [ ] It passes lint, typecheck, and security scans.
- [ ] It updates the service doc if the contract changed.
- [ ] It exposes metrics/health if it's a new service.

## Strategy per phase

- **F0**: the testing harness exists before the first feature. Testcontainers configured. The cross-tenant isolation test is written alongside Atlas.
- **F1+**: each app is born with its suite. E2E covers each app's main happy path.
- **F6**: serious load testing, external pentest, DR tests (restoring backups).
