# ADR-0004 · Identity with Keycloak/Authentik (don't build the IdP)

- **Status:** Accepted
- **Date:** (F0)

## Context
Atlas must provide SSO (OIDC/OAuth2), MFA, federation, and multi-tenancy. Auth done wrong is the most common path to a breach.

## Options considered
1. **Build our own IdP** — full control, but extremely high security risk and a lot of work (OIDC, MFA, federation, key rotation...).
2. **Integrate Keycloak** — battle-tested OSS IdP, full OIDC/OAuth2, MFA, federation, realms for multi-tenancy.
3. **Integrate Authentik** — a more modern/lightweight alternative, also OSS.

## Decision
**Integrate Keycloak** as Atlas's engine (Authentik as an evaluable alternative). Atlas = configured Keycloak + a thin custom API/UI layer for organizations and the Nébula experience.

## Consequences
- Positive: proven auth security; standard OIDC consumed identically by all apps; MFA and federation "for free"; realms help with multi-tenant isolation.
- Negative: Keycloak is heavy and has an operational learning curve; customizing its UI has limits.
- Exit plan: speaking standard OIDC, apps don't depend on Keycloak specifically; switching IdPs doesn't force touching the apps, only Atlas.
