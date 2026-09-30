import { getSessionUser, json, badRequest, unauthorized, notFound } from '../../lib/auth.js';
import { getStationeryContext } from '../../lib/stationery-auth.js';

const MAX_BYTES = 40 * 1024 * 1024; // 40 MB
const ALLOWED_PREFIXES = ['photostudio', 'documents', 'jobs', 'logos'];

// POST /api/stationery/files — multipart/form-data { file, folder }
// folder is one of ALLOWED_PREFIXES; keeps the vault tidy in R2.
export async function uploadFile({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  if (!env.STATIONERY_FILES) return json({ error: 'Storage is not configured. Ask an admin to bind the STATIONERY_FILES R2 bucket.' }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const folder = ALLOWED_PREFIXES.includes(form?.get('folder')) ? form.get('folder') : 'documents';
  if (!form || !file || typeof file === 'string') return badRequest('file is required (multipart/form-data).');
  if (file.size > MAX_BYTES) return badRequest('File is too large (40MB max).');

  const key = `stationery/${ctx.business.id}/${folder}/${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
  await env.STATIONERY_FILES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || 'application/octet-stream' } });

  return json({ key, name: file.name, size: file.size, type: file.type }, { status: 201 });
}

// GET /api/stationery/files/:key(base64url) — fetch back a stored file.
// Note: the router already decodeURIComponent()s route params once, so
// params.key here is already the real R2 key (client must
// encodeURIComponent() the whole key when building the URL).
export async function getFile({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (!env.STATIONERY_FILES) return notFound('Storage is not configured.');

  const key = params.key;
  if (!key.startsWith('stationery/')) return badRequest('Invalid file key.');

  const object = await env.STATIONERY_FILES.get(key);
  if (!object) return notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'private, max-age=3600');
  return new Response(object.body, { headers });
}

export async function deleteFile({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  if (!env.STATIONERY_FILES) return json({ ok: true });

  const key = params.key;
  if (!key.startsWith(`stationery/${ctx.business.id}/`)) return badRequest('Invalid file key.');
  await env.STATIONERY_FILES.delete(key);
  return json({ ok: true });
}
