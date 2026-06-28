const BFF = process.env.NEXT_PUBLIC_BFF_URL ?? 'http://localhost:4011';

export interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  status: string;
}
export interface FolderItem {
  id: string;
  name: string;
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
  me: () => req<{ sub: string; org_id: string; roles: string[] }>('/api/auth/me'),
  list: (folderId = 'root') =>
    req<{ folders: FolderItem[]; files: FileItem[] }>(`/api/folders/${folderId}/children`),
  createFolder: (name: string, parentFolderId: string | null = null) =>
    req<FolderItem>('/api/folders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, parentFolderId }),
    }),
  upload: (file: File, parentFolderId: string | null = null) => {
    const fd = new FormData();
    fd.append('file', file);
    if (parentFolderId) fd.append('parentFolderId', parentFolderId);
    return req<FileItem>('/api/files', { method: 'POST', body: fd });
  },
  contentUrl: (id: string) => req<{ url: string }>(`/api/files/${id}/content`),
  trash: (id: string) => req(`/api/files/${id}`, { method: 'DELETE' }),
  share: (resourceId: string, granteeId: string, permission: string) =>
    req('/api/shares', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        resourceId,
        granteeId,
        permission,
        resourceType: 'file',
        granteeType: 'user',
      }),
    }),
};

export { BFF };
