# Per-service specs

Each service has (or will have) its own spec covering: responsibility, data model, main API, events it publishes/consumes, and dependencies.

## Spec status

| Service | Spec | Phase |
|---------|------|-------|
| Atlas (identity) | [`atlas.md`](atlas.md) ✅ | F0 |
| Vega (storage) | [`vega.md`](vega.md) ✅ | F1 |
| Lyra (documents) | [`lyra.md`](lyra.md) ✅ | F2 |
| Helios (dashboard) | *pending* | F1 |
| Núcleo (shared) | *pending* | F0 |
| Cosmos (wiki) | *pending* | F2 |
| Orión (sheets) | *pending* | F3 |
| Aurora (slides) | *pending* | F3 |
| Pulsar (chat) | *pending* | F4 |
| Iris (mail) | *pending* | F4 |
| Cronos (calendar) | *pending* | F4 |
| Quásar (video) | *pending* | F5 |

> Specs are written **right before** starting each service, not all up front (avoids docs that rot without code). The three marked ✅ serve as templates.

## Spec template

```markdown
# <Name> · <one line of what it does>

## Responsibility
What it does and what it does NOT (boundaries).

## Data model
Main entities and relationships.

## Main API
Key endpoints (verb, path, what they do).

## Events
- Publishes: ...
- Consumes: ...

## Dependencies
What it needs from Núcleo / other services.

## Security considerations
Permissions, isolation, sensitive data.
```
