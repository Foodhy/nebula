import * as Y from 'yjs';

/** Rebuild a Y.Doc by applying all stored updates in order. */
export function buildDoc(updates: Uint8Array[]): Y.Doc {
  const doc = new Y.Doc();
  for (const u of updates) Y.applyUpdate(doc, u);
  return doc;
}

/** Encode the full doc state as a single update (for snapshots to Vega). */
export function snapshotUpdate(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}

/** Plain-text projection of the doc's shared text (Tiptap stores in a fragment;
 * for F2 the canonical text lives in the 'content' Y.Text). */
export function docText(doc: Y.Doc): string {
  return doc.getText('content').toString();
}
