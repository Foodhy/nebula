import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';
import { initTracing, registry, startDefaultMetrics } from '@nebula/observability';
import type { JwtClaims } from '@nebula/types';
import { Pool } from 'pg';
import { buildDoc, docText } from './collab/yjs-persistence.js';
import { loadLyraEnv } from './config.js';
import { DocStore } from './infra/doc-store.js';
import { snapshotToVega } from './infra/snapshot-vega.js';
import { type Verifier, makeVerifier } from './infra/verifier.js';
import { setupCollab } from './ws/collab-server.js';

function send(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(json);
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

async function authed(req: IncomingMessage, verify: Verifier): Promise<JwtClaims | null> {
  const header = req.headers.authorization;
  const token = header?.toLowerCase().startsWith('bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    return await verify(token);
  } catch {
    return null;
  }
}

async function bootstrap(): Promise<void> {
  initTracing({
    serviceName: 'lyra-collab',
    otlpUrl: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? 'http://localhost:4318/v1/traces',
  });
  startDefaultMetrics('lyra-collab');

  const env = loadLyraEnv();
  const pool = new Pool({
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    database: env.POSTGRES_DB,
    user: env.NEBULA_APP_DB_USER,
    password: env.NEBULA_APP_DB_PASSWORD,
  });
  const store = new DocStore(pool);
  const verify = makeVerifier(
    `${env.KEYCLOAK_BASE_URL}/realms/${env.KEYCLOAK_REALM}`,
    env.OIDC_CLIENT_ID,
  );

  const server = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? '', 'http://localhost');
      const { pathname } = url;

      if (req.method === 'GET' && pathname === '/health') return send(res, 200, { status: 'ok' });
      if (req.method === 'GET' && pathname === '/metrics') {
        const body = await registry.metrics();
        res.writeHead(200, { 'content-type': 'text/plain; version=0.0.4' });
        return res.end(body);
      }

      const claims = await authed(req, verify);
      if (!claims) return send(res, 401, { error: 'unauthenticated' });
      const orgId = claims.org_id;
      const userId = claims.sub;
      const bearer = (req.headers.authorization as string).slice(7);

      // POST /docs  { title }
      if (req.method === 'POST' && pathname === '/docs') {
        const body = await readJson(req);
        const doc = await store.createDoc(orgId, userId, String(body.title ?? 'Untitled'));
        return send(res, 201, doc);
      }

      const docMatch = pathname.match(/^\/docs\/([0-9a-f-]+)$/);
      if (req.method === 'GET' && docMatch) {
        const doc = await store.getDoc(orgId, docMatch[1] as string);
        return doc ? send(res, 200, doc) : send(res, 404, { error: 'not found' });
      }

      const snapMatch = pathname.match(/^\/docs\/([0-9a-f-]+)\/snapshot$/);
      if (req.method === 'POST' && snapMatch) {
        const docId = snapMatch[1] as string;
        const doc = await store.getDoc(orgId, docId);
        if (!doc) return send(res, 404, { error: 'not found' });
        // Prefer client-rendered text (Tiptap XmlFragment); fall back to server Y.Text.
        const body = await readJson(req);
        const text =
          typeof body.text === 'string' && body.text.length > 0
            ? body.text
            : docText(buildDoc(await store.loadUpdates(orgId, docId)));
        const vegaFileId = await snapshotToVega(
          env.VEGA_STORAGE_URL,
          bearer,
          `${doc.title}.md`,
          text,
        );
        await store.setVegaFile(orgId, docId, vegaFileId);
        return send(res, 200, { vegaFileId });
      }

      send(res, 404, { error: 'not found' });
    })().catch((err) => send(res, 500, { error: (err as Error).message }));
  });

  setupCollab(server, { store, verify });
  server.listen(env.LYRA_PORT, () => console.log(`[lyra-collab] listening on :${env.LYRA_PORT}`));
}

void bootstrap();
