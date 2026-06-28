const BFF = process.env.NEXT_PUBLIC_HELIOS_BFF_URL ?? 'http://localhost:4020';

export interface AppEntry {
  id: string;
  name: string;
  desc: string;
  url: string;
  status: string;
}
export interface FileHit {
  id: string;
  name: string;
  size: number;
}

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
  apps: () => req<AppEntry[]>('/api/apps'),
  notifications: () => req<unknown[]>('/api/notifications'),
  search: (q: string) => req<FileHit[]>(`/api/search?q=${encodeURIComponent(q)}`),
};
