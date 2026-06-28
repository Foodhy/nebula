'use client';

import { type AppEntry, type FileHit, api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const router = useRouter();
  const [me, setMe] = useState<{ org_id: string } | null>(null);
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<FileHit[] | null>(null);

  useEffect(() => {
    api
      .me()
      .then((u) => {
        setMe(u);
        return api.apps();
      })
      .then(setApps)
      .catch(() => router.push('/login'));
  }, [router]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) {
      setHits(null);
      return;
    }
    setHits(await api.search(q));
  }

  async function logout() {
    await api.logout();
    router.push('/login');
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ flex: 1 }}>Helios</h1>
        <span className="muted">org {me?.org_id?.slice(0, 8)}…</span>
        <button className="secondary" onClick={logout} type="button">
          Logout
        </button>
      </div>

      <form onSubmit={search} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          style={{ flex: 1 }}
          placeholder="Search files…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      {hits !== null && (
        <div className="panel">
          <strong>Results</strong>
          {hits.length === 0 && <p className="muted">No files match “{q}”.</p>}
          {hits.map((f) => (
            <div className="row" key={f.id}>
              📄 {f.name} <span className="muted">({f.size} B)</span>
            </div>
          ))}
        </div>
      )}

      <div className="panel">
        <strong>Apps</strong>
        <div className="grid" style={{ marginTop: 12 }}>
          {apps.map((a) => (
            <div className={`card ${a.status === 'soon' ? 'soon' : ''}`} key={a.id}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{a.name}</div>
              <div className="muted">{a.desc}</div>
              {a.status === 'live' ? (
                <a href={a.url} target="_blank" rel="noreferrer">
                  Open →
                </a>
              ) : (
                <span className="muted">coming soon</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <strong>Notifications</strong>
        <p className="muted">No new notifications.</p>
      </div>
    </div>
  );
}
