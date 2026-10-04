// Smart21Institution — files inside backups (e-library files, covers, student photos, student documents).
//
// The backup JSON holds records only. The uploaded files themselves are copied, once each, into a private
// folder of the same R2 bucket:  institution/<id>/backup-files/<hash of the original key>
// Each backup also gets a small manifest  <backup>.files.json  that lists every file the records point to:
//     { k: original key, b: copy key, s: size, ct: content type, st: 'saved' | 'pending' | 'missing' }
//   saved    a copy exists in the backup folder
//   pending  not copied yet in this run (too many new files at once) — the next backup continues where this one stopped
//   missing  the record points to a file that was not in storage when the backup ran
// Uploaded files are never changed in place (a replacement gets a new random key), so one copy per original key is
// enough and later backups only copy files that are new. Copies that no remaining backup refers to are removed.

export const FILE_SOURCES = [
  { table: 'ins_students', col: 'photo_key' }, { table: 'ins_staff', col: 'photo_key' }, { table: 'ins_books', col: 'cover_key' },
  { table: 'ins_resources', col: 'file_key' }, { table: 'ins_resources', col: 'thumb_key' }, { table: 'ins_student_documents', col: 'file_key' },
];
const GC_GRACE_MS = 24 * 3600 * 1000;       // a copy younger than this may belong to a backup that is still being written
const MAX_GC_DELETES = 300;

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function keyHash(key) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))).slice(0, 40); }
export const blobPrefix = (instId) => `institution/${instId}/backup-files/`;
export const manifestKey = (backupKey) => String(backupKey).replace(/\.json$/, '') + '.files.json';

// All copies currently in the backup folder: Map(copy key -> { size, uploaded })
export async function listBlobs(env, instId) {
  const out = new Map(); let cursor;
  for (let i = 0; i < 200; i++) {
    const page = await env.MATERIALS.list({ prefix: blobPrefix(instId), cursor, limit: 1000 });
    for (const o of page.objects) out.set(o.key, { size: o.size, uploaded: o.uploaded ? new Date(o.uploaded).getTime() : 0 });
    if (!page.truncated) break;
    cursor = page.cursor;
  }
  return out;
}

export async function saveFilesForBackup(env, instId, tables, maxCopies) {
  const refs = new Set();
  for (const src of FILE_SOURCES) for (const row of tables[src.table] || []) if (row[src.col]) refs.add(row[src.col]);
  const existing = await listBlobs(env, instId);
  const manifest = []; let copies = 0;
  for (const key of refs) {
    const blob = blobPrefix(instId) + await keyHash(key);
    if (existing.has(blob)) { manifest.push({ k: key, b: blob, s: existing.get(blob).size, st: 'saved' }); continue; }
    if (copies >= maxCopies) { manifest.push({ k: key, st: 'pending' }); continue; }
    const obj = await env.MATERIALS.get(key);
    if (!obj) { manifest.push({ k: key, st: 'missing' }); continue; }
    const ct = (obj.httpMetadata && obj.httpMetadata.contentType) || 'application/octet-stream';
    const bytes = await obj.arrayBuffer();
    await env.MATERIALS.put(blob, bytes, { httpMetadata: { contentType: ct } });
    copies++;
    manifest.push({ k: key, b: blob, s: bytes.byteLength, ct, st: 'saved' });
  }
  const count = (st) => manifest.filter((m) => m.st === st).length;
  return { manifest, summary: { total: manifest.length, saved: count('saved'), pending: count('pending'), missing: count('missing') } };
}

export async function readManifest(env, backupKey) {
  const obj = env.MATERIALS ? await env.MATERIALS.get(manifestKey(backupKey)) : null;
  if (!obj) return null;
  try { const m = JSON.parse(await obj.text()); return Array.isArray(m) ? m : null; } catch (e) { return null; }
}

// Remove copies that no remaining backup refers to.
export async function gcBlobs(env, instId) {
  if (!env.MATERIALS) return 0;
  const existing = await listBlobs(env, instId);
  if (!existing.size) return 0;
  const { results } = await env.DB.prepare('SELECT file_key FROM ins_backups WHERE institution_id = ?').bind(instId).all();
  const keep = new Set();
  for (const b of results) { const m = await readManifest(env, b.file_key); if (m) m.forEach((e) => { if (e.b) keep.add(e.b); }); }
  let n = 0; const now = Date.now();
  for (const [key, info] of existing) {
    if (n >= MAX_GC_DELETES) break;
    if (keep.has(key) || now - info.uploaded < GC_GRACE_MS) continue;
    await env.MATERIALS.delete(key).catch(() => {}); n++;
  }
  return n;
}

// Put files back from the backup folder to their original keys. Works in batches so one request never does too much.
export async function restoreFileBatch(env, instId, manifest, start = 0, size = 120) {
  const res = { total: manifest.length, restored: 0, present: 0, missing: 0, failed: 0, next: null };
  const slice = manifest.slice(start, start + size);
  for (const e of slice) {
    if (e.st !== 'saved' || !e.b) { res.missing++; continue; }
    // the manifest is our own file, but never trust a key blindly: stay inside this institution's own folders
    if (!String(e.k).startsWith(`institution/${instId}/`) || String(e.k).includes('..') || String(e.k).startsWith(blobPrefix(instId)) || !String(e.b).startsWith(blobPrefix(instId))) { res.failed++; continue; }
    try {
      if (await env.MATERIALS.head(e.k)) { res.present++; continue; }
      const obj = await env.MATERIALS.get(e.b);
      if (!obj) { res.missing++; continue; }
      await env.MATERIALS.put(e.k, await obj.arrayBuffer(), { httpMetadata: { contentType: e.ct || (obj.httpMetadata && obj.httpMetadata.contentType) || 'application/octet-stream' } });
      res.restored++;
    } catch (err) { res.failed++; }
  }
  if (start + size < manifest.length) res.next = start + size;
  return res;
}
