/**
 * Persist a document snapshot into Vega as a Markdown file, using the caller's
 * bearer (so vega-storage enforces the same org/permissions). Returns file id.
 */
export async function snapshotToVega(
  vegaBase: string,
  bearer: string,
  name: string,
  text: string,
): Promise<string> {
  const initRes = await fetch(`${vegaBase}/files/upload-init`, {
    method: 'POST',
    headers: { authorization: `Bearer ${bearer}`, 'content-type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'text/markdown', parentFolderId: null }),
  });
  if (!initRes.ok) throw new Error(`vega upload-init failed: ${initRes.status}`);
  const init = (await initRes.json()) as { fileId: string; uploadUrl: string };

  const put = await fetch(init.uploadUrl, { method: 'PUT', body: text });
  if (!put.ok) throw new Error(`vega PUT failed: ${put.status}`);

  const done = await fetch(`${vegaBase}/files/${init.fileId}/upload-complete`, {
    method: 'POST',
    headers: { authorization: `Bearer ${bearer}` },
  });
  if (!done.ok) throw new Error(`vega upload-complete failed: ${done.status}`);
  return init.fileId;
}
