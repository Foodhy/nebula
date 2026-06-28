'use client';

import { WS_BASE, api } from '@/lib/api';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

const COLORS = ['#4c6ef5', '#f59f00', '#d6336c', '#37b24d', '#ae3ec9', '#1098ad'];

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [status, setStatus] = useState('connecting');
  const [savedAt, setSavedAt] = useState('');
  const [title, setTitle] = useState('');

  const ydoc = useMemo(() => new Y.Doc(), []);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);

  useEffect(() => {
    api
      .getDoc(id)
      .then((d) => setTitle(d.title))
      .catch(() => router.push('/login'));
  }, [id, router]);

  useEffect(() => {
    const p = new WebsocketProvider(`${WS_BASE}/collab`, id, ydoc);
    p.on('status', (e: { status: string }) => setStatus(e.status));
    setProvider(p);
    return () => p.destroy();
  }, [id, ydoc]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ history: false }),
        Collaboration.configure({ document: ydoc, field: 'content' }),
        ...(provider
          ? [
              CollaborationCursor.configure({
                provider,
                user: {
                  name: `User ${Math.floor(Math.random() * 1000)}`,
                  color: COLORS[Math.floor(Math.random() * COLORS.length)] as string,
                },
              }),
            ]
          : []),
      ],
    },
    [provider],
  );

  async function save() {
    if (!editor) return;
    const r = await api.snapshot(id, editor.getText());
    setSavedAt(`Saved to Drive (${r.vegaFileId.slice(0, 8)}…)`);
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ flex: 1 }}>{title || 'Document'}</h2>
        <span className="muted">{status}</span>
        <button onClick={save} type="button">
          Save to Drive
        </button>
        <button className="secondary" onClick={() => router.push('/docs')} type="button">
          Docs
        </button>
      </div>
      {savedAt && <p className="muted">{savedAt}</p>}
      <div className="editor">
        <EditorContent editor={editor} />
      </div>
      <p className="muted">Open this URL in another window to collaborate live.</p>
    </div>
  );
}
