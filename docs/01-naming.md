# 01 · Naming and branding

## The theme: astronomical

The suite is **Nébula** — a cosmic cloud of gas and dust from which **stars are born**. It's an exact metaphor: a platform from which all the apps are born and draw their energy. Each application is **a star or celestial body**, named so it *evokes its function*.

Why this theme:
- Scales to dozens of names without running dry (the sky is infinite).
- Pronounceable in both English and Spanish.
- Brand-neutral, with no obvious trademark clashes in productivity software.
- Aesthetically coherent for logos, colors, and iconography (each app = a color/constellation).

## Name catalog

### User apps

| App | Astronomical meaning | Why it fits its function |
|-----|---------------------|--------------------------|
| **Helios** | The Sun | The center everything orbits: the dashboard/launcher and global search. |
| **Vega** | Brightest star in Lyra | The heart of the system: storage. The most visible and used piece. |
| **Lyra** | The Lyre constellation | "Lyre" → writing, composition. The document editor. |
| **Orión** | The hunter constellation | Structure, grid, alignment → spreadsheets. |
| **Aurora** | The northern lights | Visual spectacle, light → presentations. |
| **Cosmos** | The ordered universe | All knowledge connected → notes and wiki. |
| **Pulsar** | A star emitting rhythmic pulses | Real-time messages → chat. |
| **Iris** | Messenger of the gods (and a nebula) | Formal messaging → email. |
| **Cronos** | Time (the Titan) | Calendar and time management. |
| **Quásar** | An object emitting enormous energy/signal | Live transmission → video calls. |

### Infrastructure / platform

| Component | Meaning | Function |
|-----------|---------|----------|
| **Núcleo** | Core of a star/galaxy | Shared services: tokens, search, notifications, audit log, feature flags, event bus. |
| **Órbita** | A path that surrounds and observes | Observability stack: metrics, logs, traces, alerts. |
| **Atlas** | The Titan who holds up the sky | Identity and SSO: it holds up the whole access system. |

## Technical naming convention

- **Brand name (UI, marketing):** capitalized, with accents → `Vega`, `Orión`, `Quásar`.
- **Technical identifier (code, repos, containers):** lowercase, no accents, ASCII → `vega`, `orion`, `quasar`.
- **Backend services:** `nucleo-<domain>` or `<app>-<domain>` → `nucleo-auth`, `vega-storage`, `lyra-collab`.
- **Docker images:** `nebula/<id>:<tag>` → `nebula/vega:1.2.0`.
- **Hostnames:** `<id>.yourdomain.com` → `vega.acme.com`, `helios.acme.com`.

## Alternative themes (in case the team prefers another)

If the astronomical theme doesn't land, these families also scale well:

1. **Greek mythology** — Hermes (mail), Athena (docs), Cronos (calendar), Hephaestus (forge/infra)…
2. **Minerals/gems** — Onyx, Quartz, Amber, Jade… (clean and corporate).
3. **Birds** — Raven, Hummingbird, Falcon… (LATAM-friendly, memorable).
4. **LATAM geography/mountains** — Andes, Cocora, Nevado… (regional identity).

> Architect's recommendation: keep **astronomical**. It best balances naming scalability, brand neutrality, and visual coherence.

## Branding / legal note

Before going public, verify availability of:
- A `.com`/`.io` domain for "Nébula" (likely taken → consider variants: `nebula.dev`, `getnebula.*`, `nebulahq.*`).
- Trademark search in the software class (Nice 9/42).
- Conflicts with existing OSS projects (e.g., there is a Slack overlay network called "Nebula" — check to avoid confusion in the dev ecosystem).
