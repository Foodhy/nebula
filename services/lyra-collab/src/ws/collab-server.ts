import type { Server } from 'node:http';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { type RawData, type WebSocket, WebSocketServer } from 'ws';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as Y from 'yjs';
import { buildDoc } from '../collab/yjs-persistence.js';
import type { DocStore } from '../infra/doc-store.js';
import type { Verifier } from '../infra/verifier.js';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

interface Room {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<WebSocket, Set<number>>;
}

class RoomManager {
  private readonly rooms = new Map<string, Promise<Room>>();
  constructor(private readonly store: DocStore) {}

  get(orgId: string, docId: string): Promise<Room> {
    const key = `${orgId}:${docId}`;
    let roomP = this.rooms.get(key);
    if (!roomP) {
      roomP = this.create(orgId, docId);
      this.rooms.set(key, roomP);
    }
    return roomP;
  }

  private async create(orgId: string, docId: string): Promise<Room> {
    const doc = buildDoc(await this.store.loadUpdates(orgId, docId));
    const awareness = new awarenessProtocol.Awareness(doc);
    const room: Room = { doc, awareness, conns: new Map() };

    // New edits: persist (org-scoped) + broadcast to everyone except the origin.
    doc.on('update', (update: Uint8Array, origin: unknown) => {
      void this.store.appendUpdate(orgId, docId, update);
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MESSAGE_SYNC);
      syncProtocol.writeUpdate(enc, update);
      const msg = encoding.toUint8Array(enc);
      for (const ws of room.conns.keys()) {
        if (ws !== origin && ws.readyState === ws.OPEN) ws.send(msg);
      }
    });

    awareness.on('update', (changes: { added: number[]; updated: number[]; removed: number[] }) => {
      const changed = changes.added.concat(changes.updated, changes.removed);
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(awareness, changed));
      const msg = encoding.toUint8Array(enc);
      for (const ws of room.conns.keys()) {
        if (ws.readyState === ws.OPEN) ws.send(msg);
      }
    });

    return room;
  }
}

function onConnection(ws: WebSocket, room: Room): void {
  room.conns.set(ws, new Set());

  // Sync step 1 (server → client).
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(enc, room.doc);
  ws.send(encoding.toUint8Array(enc));

  // Current awareness snapshot.
  const states = room.awareness.getStates();
  if (states.size > 0) {
    const e = encoding.createEncoder();
    encoding.writeVarUint(e, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      e,
      awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(states.keys())),
    );
    ws.send(encoding.toUint8Array(e));
  }

  ws.on('message', (data: RawData) => {
    const u8 = new Uint8Array(data as ArrayBuffer);
    const dec = decoding.createDecoder(u8);
    const type = decoding.readVarUint(dec);
    if (type === MESSAGE_SYNC) {
      const reply = encoding.createEncoder();
      encoding.writeVarUint(reply, MESSAGE_SYNC);
      // origin = ws so the doc 'update' handler broadcasts to others, not back.
      syncProtocol.readSyncMessage(dec, reply, room.doc, ws);
      if (encoding.length(reply) > 1) ws.send(encoding.toUint8Array(reply));
    } else if (type === MESSAGE_AWARENESS) {
      awarenessProtocol.applyAwarenessUpdate(room.awareness, decoding.readVarUint8Array(dec), ws);
    }
  });

  ws.on('close', () => {
    const ids = room.conns.get(ws);
    room.conns.delete(ws);
    awarenessProtocol.removeAwarenessStates(room.awareness, Array.from(ids ?? []), null);
  });
}

/** Attach the Yjs collaboration WebSocket to an HTTP server at /collab?doc=&token= */
export function setupCollab(server: Server, deps: { store: DocStore; verify: Verifier }): void {
  const wss = new WebSocketServer({ noServer: true });
  const mgr = new RoomManager(deps.store);

  server.on('upgrade', (req, socket, head) => {
    void (async () => {
      try {
        const url = new URL(req.url ?? '', 'http://localhost');
        if (url.pathname !== '/collab') return socket.destroy();
        const token = url.searchParams.get('token');
        const docId = url.searchParams.get('doc');
        if (!token || !docId) return socket.destroy();

        const claims = await deps.verify(token);
        const orgId = claims.org_id;
        const doc = await deps.store.getDoc(orgId, docId);
        if (!doc) return socket.destroy(); // not found / not this org (RLS)

        const room = await mgr.get(orgId, docId);
        wss.handleUpgrade(req, socket, head, (ws) => onConnection(ws, room));
      } catch {
        socket.destroy();
      }
    })();
  });
}
