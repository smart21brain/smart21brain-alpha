// Smart21Institution — student document attachments (birth certificate, ID, transcripts, medical letters…).
// Files live in the private R2 bucket under random keys; there is NO public URL. Every read goes through
// an endpoint that checks the signed-in person:
//   • people who may manage student records (students.manage) can list, upload, open and delete;
//   • a student can list and open their OWN documents (never other students');
//   • everybody else (including teachers and librarians) gets "not found" — these papers are sensitive.
import { json } from '../../lib/auth.js';
import { fail, secure, readJson, V, audit, getSettings, can, getInstContext } from '../../lib/institution-auth.js';
import { FILE_TYPES } from './elibrary.js';

const DOC_TYPES = ['birth_certificate', 'id_document', 'transcript', 'certificate', 'medical', 'recommendation', 'application', 'other'];
const MAX_DOCS_PER_STUDENT = 20;
const cols = 'id, student_id, title, doc_type, file_name, mime, file_size, created_at';

async function ownStudent(env, ctx, id) {
  const s = await env.DB.prepare('SELECT id, full_name FROM ins_students WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(id, ctx.inst.id).first();
  if (!s) fail(404, 'The student record could not be found.');
  return s;
}
const mayRead = (ctx, studentId) => can(ctx, 'students.manage') || (ctx.studentId && ctx.studentId === Number(studentId));

export const listDocuments = secure(async ({ env, params, ctx }) => {
  if (!mayRead(ctx, params.id)) fail(404, 'The student record could not be found.');
  await ownStudent(env, ctx, params.id);
  const { results } = await env.DB.prepare(`SELECT ${cols} FROM ins_student_documents WHERE institution_id = ? AND student_id = ? AND deleted_at IS NULL ORDER BY id DESC`).bind(ctx.inst.id, params.id).all();
  return json({ documents: results, doc_types: DOC_TYPES, can_manage: can(ctx, 'students.manage'), max: MAX_DOCS_PER_STUDENT });
});

export const uploadDocument = secure({ perm: 'students.manage' }, async ({ request, env, params, ctx }) => {
  if (!env.MATERIALS) fail(500, 'File storage is not configured.');
  const st = await ownStudent(env, ctx, params.id);
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM ins_student_documents WHERE institution_id = ? AND student_id = ? AND deleted_at IS NULL').bind(ctx.inst.id, st.id).first();
  if (count.n >= MAX_DOCS_PER_STUDENT) fail(400, `A student can have up to ${MAX_DOCS_PER_STUDENT} documents. Delete one first.`);
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, 'Please choose a file to upload.');
  const file = form.get('file');
  if (!file || typeof file === 'string' || !file.size) fail(400, 'Please choose a file to upload.');
  const settings = await getSettings(env, ctx.inst.id);
  const maxMb = Math.min(25, settings.max_upload_mb || 20);
  if (file.size > maxMb * 1024 * 1024) fail(400, `The file is too large (${maxMb} MB maximum).`);
  const name = String(file.name || 'document').replace(/[^\w.\- ()]/g, '_').slice(0, 120);
  const ext = (name.split('.').pop() || '').toLowerCase();
  const def = ext !== 'epub' ? FILE_TYPES[ext] : null;
  if (!def) fail(400, 'The file type is not supported. Use PDF, Word, Excel, PowerPoint, TXT, PNG or JPG.');
  const buf = await file.arrayBuffer();
  if (!def.ok(new Uint8Array(buf.slice(0, 4096)))) fail(400, 'The file type is not supported (the file content does not match its extension).');
  const title = V.str(form.get('title') || name.replace(/\.[^.]+$/, ''), 'Title', { required: true, min: 2, max: 160 });
  const docType = V.oneOf(form.get('doc_type'), 'Document type', DOC_TYPES, { def: 'other' });
  const key = `institution/${ctx.inst.id}/student-docs/${crypto.randomUUID()}.${ext}`;
  await env.MATERIALS.put(key, buf, { httpMetadata: { contentType: def.mime } });
  let r;
  try {
    r = await env.DB.prepare('INSERT INTO ins_student_documents (institution_id, student_id, title, doc_type, file_key, file_name, mime, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(ctx.inst.id, st.id, title, docType, key, name, def.mime, file.size, ctx.user.id).run();
  } catch (e) { await env.MATERIALS.delete(key).catch(() => {}); throw e; }
  await audit(env, request, ctx, 'students', 'document.upload', 'student', st.id, `${title} (${docType})`);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});

export async function documentFile({ request, env, params, url }) {
  const ctx = await getInstContext(request, env);
  if (ctx.error || !ctx.inst) return new Response('Not found', { status: 404 });
  const d = await env.DB.prepare('SELECT * FROM ins_student_documents WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!d || !mayRead(ctx, d.student_id)) return new Response('Not found', { status: 404 });
  const obj = env.MATERIALS ? await env.MATERIALS.get(d.file_key) : null;
  if (!obj) return new Response('The file is missing from storage.', { status: 404 });
  const ext = d.file_name.split('.').pop().toLowerCase();
  const inline = !!(FILE_TYPES[ext] && FILE_TYPES[ext].inline) && url.searchParams.get('download') !== '1';
  await audit(env, request, ctx, 'students', 'document.open', 'student', d.student_id, d.title);
  return new Response(obj.body, { headers: {
    'Content-Type': d.mime, 'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${d.file_name.replace(/"/g, '')}"`,
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:; object-src 'self'",
  } });
}

export const deleteDocument = secure({ perm: 'students.manage' }, async ({ request, env, params, ctx }) => {
  const d = await env.DB.prepare('SELECT id, student_id, title, file_key FROM ins_student_documents WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!d) fail(404, 'The document could not be found.');
  await env.DB.prepare('DELETE FROM ins_student_documents WHERE id = ?').bind(d.id).run();
  if (env.MATERIALS) await env.MATERIALS.delete(d.file_key).catch(() => {});
  await audit(env, request, ctx, 'students', 'document.delete', 'student', d.student_id, d.title);
  return json({ ok: true });
});

export const renameDocument = secure({ perm: 'students.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const d = await env.DB.prepare('SELECT id, student_id FROM ins_student_documents WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!d) fail(404, 'The document could not be found.');
  const title = V.str(b.title, 'Title', { required: true, min: 2, max: 160 });
  const docType = V.oneOf(b.doc_type, 'Document type', DOC_TYPES, { required: true });
  await env.DB.prepare('UPDATE ins_student_documents SET title = ?, doc_type = ? WHERE id = ?').bind(title, docType, d.id).run();
  await audit(env, request, ctx, 'students', 'document.update', 'student', d.student_id, title);
  return json({ ok: true });
});
