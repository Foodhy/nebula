'use client';

import { type FileItem, type FolderItem, api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function FilesPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ org_id: string } | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const data = await api.list('root');
    setFiles(data.files);
    setFolders(data.folders);
  }, []);

  useEffect(() => {
    api
      .me()
      .then((u) => {
        setMe(u);
        return load();
      })
      .catch(() => router.push('/login'));
  }, [router, load]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    try {
      await api.upload(f);
      await load();
    } catch {
      setError('Upload failed');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function download(id: string) {
    const { url } = await api.contentUrl(id);
    window.open(url, '_blank');
  }

  async function remove(id: string) {
    await api.trash(id);
    await load();
  }

  async function share(id: string) {
    const granteeId = window.prompt('Grantee user id (uuid):');
    if (!granteeId) return;
    const permission = window.prompt('Permission (viewer/editor):', 'viewer') ?? 'viewer';
    await api.share(id, granteeId, permission);
    alert('Shared');
  }

  async function newFolder() {
    const name = window.prompt('Folder name:');
    if (!name) return;
    await api.createFolder(name);
    await load();
  }

  async function logout() {
    await api.logout();
    router.push('/login');
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ flex: 1 }}>Vega</h1>
        <span className="muted">org {me?.org_id?.slice(0, 8)}…</span>
        <button className="secondary" onClick={logout} type="button">
          Logout
        </button>
      </div>

      <div className="panel">
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <button onClick={() => fileInput.current?.click()} type="button">
            Upload file
          </button>
          <button className="secondary" onClick={newFolder} type="button">
            New folder
          </button>
          <input ref={fileInput} type="file" hidden onChange={onUpload} />
        </div>
        {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}

        {folders.map((f) => (
          <div className="row" key={f.id}>
            <span>📁</span>
            <span className="grow">{f.name}</span>
          </div>
        ))}

        {files.map((f) => (
          <div className="row" key={f.id}>
            <span>📄</span>
            <span className="grow">{f.name}</span>
            <span className="muted">{fmtSize(f.size)}</span>
            <button className="secondary" onClick={() => download(f.id)} type="button">
              Download
            </button>
            <button className="secondary" onClick={() => share(f.id)} type="button">
              Share
            </button>
            <button className="secondary" onClick={() => remove(f.id)} type="button">
              Trash
            </button>
          </div>
        ))}

        {folders.length === 0 && files.length === 0 && (
          <p className="muted">No files yet. Upload one to get started.</p>
        )}
      </div>
    </div>
  );
}
