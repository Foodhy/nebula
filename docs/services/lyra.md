# Lyra · Collaborative document editor

> The Lyre: writing and composition. Documents in real time.

## Responsibility

- Create and edit rich-text documents.
- **Real-time collaboration** (multiple cursors, conflict-free).
- Comments, suggestions, and change history.
- Export to Markdown, ODF, and PDF.
- Save/open documents **through Vega** (does not store on its own).

**Does NOT do:** spreadsheets (Orión), presentations (Aurora), or storage (Vega).

## Technical base

- **CRDT with Yjs**: the collaborative data model. Resolves concurrent edits without a server arbitrating every keystroke.
- **Editor: Tiptap/ProseMirror** on top of Yjs.
- **Collaboration server** (`services/lyra-collab`): keeps the Yjs document in memory, syncs over WebSocket, and persists snapshots to Vega.

```
Client A ⇄ WebSocket ⇄ lyra-collab ⇄ WebSocket ⇄ Client B
                           │
                           └── periodic snapshot → Vega (MinIO)
```

## Data model

```
Document
  ├── id, org_id, owner_id
  ├── vega_file_id        (the "source of truth" file in Vega)
  ├── yjs_state           (persisted CRDT state)
  └── title
Comment
  ├── document_id, author_id
  ├── anchor (range in the doc)
  └── thread (replies)
```

## Main API

| Verb | Path | What it does |
|------|------|--------------|
| POST | `/documents` | Creates a document (and its Vega file). |
| GET  | `/documents/:id` | Opens (metadata + collaboration URL). |
| WS   | `/collab/:id` | WebSocket channel for real-time editing. |
| POST | `/documents/:id/comments` | Adds a comment. |
| GET  | `/documents/:id/export?format=pdf` | Exports. |

## Events

- **Publishes:** `document.created`, `document.updated`, `comment.added`.
- **Consumes:** `file.trashed` from Vega (if the source file is deleted, close sessions).

## Security

- Permissions inherited from the Vega file via `nucleo-policy` (`viewer` can't edit, `commenter` can only comment).
- Permission validated when opening the WebSocket **and** on every sensitive operation.
- Snapshots encrypted at rest (in Vega/MinIO).
- Optional E2EE (F5) for confidential documents: the collaboration server works on ciphertext (requires client-side key design).

## Known challenges (spikes to do in F2)

- Efficient persistence of Yjs state without losing history.
- Horizontal scaling of `lyra-collab` (one document = one session; shard by document, or use y-redis/shared awareness).
- Faithful export to PDF/ODF.
