export const BFF = process.env.NEXT_PUBLIC_LYRA_BFF_URL ?? 'http://localhost:4012';
export const WS_BASE = process.env.NEXT_PUBLIC_LYRA_WS_URL ?? 'ws://localhost:4012';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BFF}${path}`, { credentials: 'include', ...init });
  if (!res.ok) throw new Error(`${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  login: (username: string, password: string) =>
    req<{ ok: boolean }>('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),
  logout: () => req('/api/auth/logout', { method: 'POST' }),
  me: () => req<{ sub: string; org_id: string }>('/api/auth/me'),
  createDoc: (title: string) =>
    req<{ id: string; title: string }>('/api/docs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title }),
    }),
  getDoc: (id: string) => req<{ id: string; title: string }>(`/api/docs/${id}`),
  snapshot: (id: string, text: string) =>
    req<{ vegaFileId: string }>(`/api/docs/${id}/snapshot`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    }),
};
