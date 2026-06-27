# ADR-0003 · Integrate OnlyOffice/Collabora vs build the Office editors

- **Status:** Accepted
- **Date:** (before F3)

## Context
Orión (sheets) and Aurora (slides) need real .xlsx/.pptx compatibility. Building a compatible Office engine from scratch takes person-years.

## Options considered
1. **Build from scratch** — full control and a 100% Nébula experience, but enormous cost and risk; MS-format compatibility is a bottomless pit.
2. **Integrate OnlyOffice Docs or Collabora Online** — mature OSS editors, compatible with MS formats, embeddable.

## Decision
For sheets and slides (F3): **integrate OnlyOffice/Collabora**, wrapped in Nébula's UI and saving into Vega. For text documents (Lyra, F2): **build** on Yjs/Tiptap, because real-time collaboration is a differentiator and rich text is more tractable than sheets/slides.

## Consequences
- Positive: MS Office compatibility without years of development; team focus on what's differential (integration, sharing, multi-tenancy).
- Negative: we depend on an external project; its UI isn't 100% ours; another service to operate.
- Exit plan: isolate the integration behind our own interface; if OnlyOffice/Collabora stops serving us, the engine can be swapped without redoing the Nébula layer. Re-evaluate building our own if the product matures and justifies it.
