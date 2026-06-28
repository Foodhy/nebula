'use client';

import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.login(username, password);
      router.push('/docs');
    } catch {
      setError('Invalid username or password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 380, marginTop: 80 }}>
      <h1>Lyra</h1>
      <p className="muted">Collaborative documents</p>
      <form className="panel" onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <span style={{ color: '#ff6b6b' }}>{error}</span>}
        <button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
