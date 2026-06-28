'use client';

import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DocsHome() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState('Untitled');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .me()
      .then(() => setReady(true))
      .catch(() => router.push('/login'));
  }, [router]);

  async function create() {
    setBusy(true);
    try {
      const doc = await api.createDoc(title || 'Untitled');
      router.push(`/docs/${doc.id}`);
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <h1>Lyra</h1>
      <div className="panel" style={{ display: 'grid', gap: 12, maxWidth: 460 }}>
        <strong>New document</strong>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <button onClick={create} disabled={busy} type="button">
          {busy ? 'Creating…' : 'Create & open'}
        </button>
        <p className="muted">
          Open the same document URL in two windows to see real-time collaboration.
        </p>
      </div>
    </div>
  );
}
