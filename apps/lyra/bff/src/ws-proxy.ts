import type { Server } from 'node:http';
import { AT_COOKIE } from '@nebula/bff-kit';
import { WebSocket, WebSocketServer } from 'ws';
import type { LyraBffEnv } from './config.js';

function cookieValue(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

/**
 * Proxy the collaboration WebSocket: browser → lyra-bff → lyra-collab. The token
 * is injected from the httpOnly cookie (never exposed to the browser), so the web
 * talks only to its BFF (CLAUDE rule 6). Path: /collab/<docId> (y-websocket room).
 */
export function setupCollabProxy(server: Server, env: LyraBffEnv): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '', 'http://localhost');
    if (!url.pathname.startsWith('/collab/')) return; // let other upgrades pass
    const docId = url.pathname.slice('/collab/'.length);
    const token = cookieValue(req.headers.cookie, AT_COOKIE);
    if (!docId || !token) return socket.destroy();

    wss.handleUpgrade(req, socket, head, (client) => {
      const upstream = new WebSocket(
        `${env.LYRA_COLLAB_WS}/collab?doc=${encodeURIComponent(docId)}&token=${encodeURIComponent(token)}`,
      );
      const queue: Array<Buffer | ArrayBuffer | Buffer[]> = [];
      upstream.on('open', () => {
        for (const m of queue) upstream.send(m);
        queue.length = 0;
      });
      client.on('message', (data) => {
        if (upstream.readyState === WebSocket.OPEN) upstream.send(data);
        else queue.push(data as Buffer);
      });
      upstream.on('message', (data) => {
        if (client.readyState === WebSocket.OPEN) client.send(data);
      });
      const closeBoth = () => {
        if (client.readyState === WebSocket.OPEN) client.close();
        if (upstream.readyState === WebSocket.OPEN) upstream.close();
      };
      client.on('close', closeBoth);
      upstream.on('close', closeBoth);
      client.on('error', closeBoth);
      upstream.on('error', closeBoth);
    });
  });
}
