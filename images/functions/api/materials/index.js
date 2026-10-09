import { getSessionUser, json, badRequest, unauthorized, forbidden } from '../../_lib/auth.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT id, title, subject, file_type, file_size, created_at FROM materials ORDER BY created_at DESC'
  ).all();
  return json({ materials: results });
}

// Expects multipart/form-data: fields "title", "subject" (optional), file "file".
export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const title = form?.get('title');
  if (!form || !file || typeof file === 'string' || !title) {
    return badRequest('title and file are required (multipart/form-data).');
  }

  const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) {
    return badRequest('Only PDF or image files (png/jpg/webp/gif) are allowed.');
  }
  const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
  if (file.size > MAX_BYTES) return badRequest('File is too large (25MB max).');

  const key = `materials/${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
  await env.MATERIALS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  const fileType = file.type === 'application/pdf' ? 'pdf' : 'image';
  const result = await env.DB.prepare(
    `INSERT INTO materials (title, subject, file_key, file_type, file_size, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(title, form.get('subject') || null, key, fileType, file.size, user.id).run();

  return json({ id: result.meta.last_row_id, file_key: key }, { status: 201 });
}
