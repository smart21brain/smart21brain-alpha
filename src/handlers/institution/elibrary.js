// Smart21Institution — E-Library: secure digital resources.
// Files live in the private R2 bucket under random keys. There is NO public URL:
// every view / download goes through an endpoint that checks the resource's
// access level, the person's role & permission, and the view / download switches.
import { json } from '../../lib/auth.js';
import {
  fail, secure, readJson, V, audit, getSettings, likeTerm, paging, can, storeImage, imageResponse, getInstContext, errorResponse, randomToken,
} from '../../lib/institution-auth.js';

const TYPES = ['ebook', 'document', 'journal', 'notes', 'research', 'publication', 'other'];
const LEVELS = ['public', 'members', 'staff'];

// Allowed uploads: extension -> { mime, check(bytes) } — the real bytes must match.
const isPK = (b) => b[0] === 0x50 && b[1] === 0x4b && (b[2] === 3 || b[2] === 5);
const isOle = (b) => b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;
const isText = (b) => { for (let i = 0; i < b.length; i++) if (b[i] === 0) return false; return true; };
const FILE_TYPES = {
  pdf:  { mime: 'application/pdf', ok: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46, inline: true },
  epub: { mime: 'application/epub+zip', ok: isPK },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ok: isPK },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ok: isPK },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ok: isPK },
  doc:  { mime: 'application/msword', ok: isOle },
  xls:  { mime: 'application/vnd.ms-excel', ok: isOle },
  ppt:  { mime: 'application/vnd.ms-powerpoint', ok: isOle },
  txt:  { mime: 'text/plain; charset=utf-8', ok: isText, inline: true },
  png:  { mime: 'image/png', ok: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47, inline: true },
  jpg:  { mime: 'image/jpeg', ok: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, inline: true },
  jpeg: { mime: 'image/jpeg', ok: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, inline: true },
};

async function readUpload(env, ctx, file) {
  if (!env.MATERIALS) fail(500, 'File storage is not configured.');
  if (!file || typeof file === 'string' || !file.size) fail(400, 'Please choose a file to upload.');
  const settings = await getSettings(env, ctx.inst.id);
  const maxMb = Math.min(25, settings.max_upload_mb || 20);
  if (file.size > maxMb * 1024 * 1024) fail(400, `The file is too large (${maxMb} MB maximum).`);
  const name = String(file.name || 'file').replace(/[^\w.\- ()]/g, '_').slice(0, 120);
  const ext = (name.split('.').pop() || '').toLowerCase();
  const def = FILE_TYPES[ext];
  if (!def) fail(400, 'The file type is not supported. Use PDF, Word, Excel, PowerPoint, EPUB, TXT, PNG or JPG.');
  const buf = await file.arrayBuffer();
  if (!def.ok(new Uint8Array(buf.slice(0, 4096)))) fail(400, 'The file type is not supported (the file content does not match its extension).');
  const key = `institution/${ctx.inst.id}/resources/${crypto.randomUUID()}.${ext}`;
  await env.MATERIALS.put(key, buf, { httpMetadata: { contentType: def.mime } });
  return { key, name, size: file.size, mime: def.mime };
}

function readMeta(b) {
  return {
    title: V.str(b.title, 'Title', { required: true, max: 250, min: 2 }),
    author: V.str(b.author, 'Author', { max: 200 }),
    description: V.str(b.description, 'Description', { max: 2000 }),
    category_id: V.int(b.category_id, 'Category', { min: 1 }),
    subject: V.str(b.subject, 'Subject', { max: 160 }),
    res_type: V.oneOf(b.res_type, 'Type', TYPES, { def: 'document' }),
    access_level: V.oneOf(b.access_level, 'Access level', LEVELS, { def: 'members' }),
    allow_view: b.allow_view === undefined || b.allow_view === '' ? 1 : (String(b.allow_view) === '0' || b.allow_view === false ? 0 : 1),
    allow_download: b.allow_download === undefined || b.allow_download === '' ? 1 : (String(b.allow_download) === '0' || b.allow_download === false ? 0 : 1),
  };
}

async function assertResCategory(env, instId, id) {
  if (!id) return;
  const c = await env.DB.prepare('SELECT id FROM ins_resource_categories WHERE id = ? AND institution_id = ?').bind(id, instId).first();
  if (!c) fail(400, 'That category does not exist.');
}

const visibleLevels = (ctx) => (can(ctx, 'resources.manage') || ctx.role !== 'student' ? LEVELS : ['public', 'members']);
const levelAllowed = (ctx, level) => level === 'public' || (can(ctx, 'resources.view') || can(ctx, 'resources.manage')) && visibleLevels(ctx).includes(level);

const listCols = `r.id, r.title, r.author, r.description, r.subject, r.res_type, r.access_level, r.allow_view, r.allow_download, r.file_name, r.file_size, r.mime,
  r.views, r.downloads, r.created_at, r.category_id, (r.thumb_key IS NOT NULL) AS has_thumb, c.name AS category`;

export const listResources = secure({ perm: ['resources.view', 'resources.manage'] }, async ({ env, url, ctx }) => {
  const sp = url.searchParams; const { page, limit, offset } = paging(url, 12, 60);
  const lv = visibleLevels(ctx);
  const where = [`r.institution_id = ?1`, 'r.deleted_at IS NULL', `r.access_level IN (${lv.map((_, i) => `?${i + 2}`).join(',')})`];
  const binds = [ctx.inst.id, ...lv];
  const add = (sql, v) => { where.push(sql.replace('?', `?${binds.length + 1}`)); binds.push(v); };
  const q = (sp.get('q') || '').trim();
  if (q) { const like = likeTerm(q); where.push(`(r.title LIKE ?${binds.length + 1} ESCAPE '\\' OR r.author LIKE ?${binds.length + 1} ESCAPE '\\' OR r.subject LIKE ?${binds.length + 1} ESCAPE '\\' OR r.description LIKE ?${binds.length + 1} ESCAPE '\\')`); binds.push(like); }
  if (sp.get('category_id')) add('r.category_id = ?', V.int(sp.get('category_id'), 'Category', { min: 1 }));
  if (sp.get('type')) add('r.res_type = ?', V.oneOf(sp.get('type'), 'Type', TYPES, { required: true }));
  const SORTS = { title: 'r.title COLLATE NOCASE', recent: 'r.id DESC', popular: 'r.views + r.downloads DESC' };
  const order = SORTS[sp.get('sort')] || SORTS.recent;
  const base = `FROM ins_resources r LEFT JOIN ins_resource_categories c ON c.id = r.category_id WHERE ${where.join(' AND ')}`;
  const [{ results }, n] = await Promise.all([
    env.DB.prepare(`SELECT ${listCols} ${base} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${base}`).bind(...binds).first(),
  ]);
  return json({ resources: results, total: n.n, page, limit });
});

export const uploadResource = secure({ perm: 'resources.manage' }, async ({ request, env, ctx }) => {
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, 'Please choose a file to upload.');
  const meta = readMeta(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string')));
  await assertResCategory(env, ctx.inst.id, meta.category_id);
  const up = await readUpload(env, ctx, form.get('file'));
  let thumb = null;
  const t = form.get('thumbnail');
  if (t && typeof t !== 'string' && t.size) {
    try { thumb = await storeImage(env, t, `institution/${ctx.inst.id}/thumb`); } catch (e) { await env.MATERIALS.delete(up.key).catch(() => {}); throw e; }
  }
  const r = await env.DB.prepare(
    `INSERT INTO ins_resources (institution_id, title, author, description, category_id, subject, res_type, file_key, file_name, file_size, mime, thumb_key, access_level, allow_view, allow_download, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(ctx.inst.id, meta.title, meta.author, meta.description, meta.category_id, meta.subject, meta.res_type, up.key, up.name, up.size, up.mime, thumb, meta.access_level, meta.allow_view, meta.allow_download, ctx.user.id).run();
  await audit(env, request, ctx, 'elibrary', 'file.upload', 'resource', r.meta.last_row_id, `${meta.title} (${up.name})`);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});

export const updateResource = secure({ perm: 'resources.manage' }, async ({ request, env, params, ctx }) => {
  const cur = await env.DB.prepare('SELECT * FROM ins_resources WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!cur) fail(404, 'The resource could not be found.');
  const ct = request.headers.get('Content-Type') || '';
  let fields; let form = null;
  if (ct.includes('multipart/form-data')) { form = await request.formData(); fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string')); }
  else fields = await readJson(request);
  const meta = readMeta(fields);
  await assertResCategory(env, ctx.inst.id, meta.category_id);
  let file = { key: cur.file_key, name: cur.file_name, size: cur.file_size, mime: cur.mime };
  const f = form && form.get('file');
  if (f && typeof f !== 'string' && f.size) file = await readUpload(env, ctx, f);       // replace file
  let thumb = cur.thumb_key;
  const t = form && form.get('thumbnail');
  if (t && typeof t !== 'string' && t.size) thumb = await storeImage(env, t, `institution/${ctx.inst.id}/thumb`);
  await env.DB.prepare(
    `UPDATE ins_resources SET title=?, author=?, description=?, category_id=?, subject=?, res_type=?, access_level=?, allow_view=?, allow_download=?,
       file_key=?, file_name=?, file_size=?, mime=?, thumb_key=?, updated_at=datetime('now') WHERE id = ? AND institution_id = ?`
  ).bind(meta.title, meta.author, meta.description, meta.category_id, meta.subject, meta.res_type, meta.access_level, meta.allow_view, meta.allow_download,
    file.key, file.name, file.size, file.mime, thumb, cur.id, ctx.inst.id).run();
  if (file.key !== cur.file_key && env.MATERIALS) await env.MATERIALS.delete(cur.file_key).catch(() => {});
  if (thumb !== cur.thumb_key && cur.thumb_key && env.MATERIALS) await env.MATERIALS.delete(cur.thumb_key).catch(() => {});
  await audit(env, request, ctx, 'elibrary', file.key !== cur.file_key ? 'file.replace' : 'file.update', 'resource', cur.id, meta.title);
  return json({ ok: true });
});

export const deleteResource = secure({ perm: 'resources.manage' }, async ({ request, env, params, ctx }) => {
  const cur = await env.DB.prepare('SELECT * FROM ins_resources WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!cur) fail(404, 'The resource could not be found.');
  await env.DB.prepare(`UPDATE ins_resources SET deleted_at = datetime('now') WHERE id = ?`).bind(cur.id).run();
  if (env.MATERIALS) { await env.MATERIALS.delete(cur.file_key).catch(() => {}); if (cur.thumb_key) await env.MATERIALS.delete(cur.thumb_key).catch(() => {}); }
  await audit(env, request, ctx, 'elibrary', 'file.delete', 'resource', cur.id, cur.title);
  return json({ ok: true });
});

export const listResourceCategories = secure(async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.name, (SELECT COUNT(*) FROM ins_resources r WHERE r.category_id = c.id AND r.deleted_at IS NULL) AS items FROM ins_resource_categories c WHERE c.institution_id = ? ORDER BY c.name`
  ).bind(ctx.inst.id).all();
  return json({ categories: results });
});
export const saveResourceCategory = secure({ perm: 'resources.manage' }, async ({ request, env, params, ctx }) => {
  const name = V.str((await readJson(request)).name, 'Category name', { required: true, max: 60, min: 2 });
  const dup = await env.DB.prepare('SELECT id FROM ins_resource_categories WHERE institution_id = ? AND name = ? COLLATE NOCASE AND id != ?').bind(ctx.inst.id, name, Number(params.id) || 0).first();
  if (dup) fail(409, 'A category with this name already exists.');
  if (params.id) {
    const r = await env.DB.prepare('UPDATE ins_resource_categories SET name = ? WHERE id = ? AND institution_id = ?').bind(name, params.id, ctx.inst.id).run();
    if (!r.meta.changes) fail(404, 'Category not found.');
  } else await env.DB.prepare('INSERT INTO ins_resource_categories (institution_id, name) VALUES (?, ?)').bind(ctx.inst.id, name).run();
  await audit(env, request, ctx, 'elibrary', 'category.save', 'category', Number(params.id) || null, name);
  return json({ ok: true });
});
export const deleteResourceCategory = secure({ perm: 'resources.manage' }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare('DELETE FROM ins_resource_categories WHERE id = ? AND institution_id = ?').bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, 'Category not found.');
  await audit(env, request, ctx, 'elibrary', 'category.delete', 'category', Number(params.id), null);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Protected file access
// ---------------------------------------------------------------------
function fileResponse(obj, r, mode) {
  const def = FILE_TYPES[(r.file_name.split('.').pop() || '').toLowerCase()] || {};
  const inline = mode === 'view' && def.inline;
  const safeName = r.file_name.replace(/[^\w.\- ()]/g, '_');
  return new Response(obj.body, {
    headers: {
      'Content-Type': r.mime,
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${safeName}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:; object-src 'self'",
      'Referrer-Policy': 'no-referrer',
    },
  });
}

async function serve(env, request, r, mode, ctx) {
  const manager = ctx && can(ctx, 'resources.manage');
  if (!manager) {
    if (mode === 'download' && !r.allow_download) fail(403, 'Downloading is not allowed for this resource.');
    if (mode === 'view' && !r.allow_view) fail(403, 'Viewing online is not allowed for this resource.');
  }
  const obj = env.MATERIALS ? await env.MATERIALS.get(r.file_key) : null;
  if (!obj) fail(404, 'The file could not be found. Please tell the librarian.');
  await env.DB.prepare(`UPDATE ins_resources SET ${mode === 'view' ? 'views' : 'downloads'} = ${mode === 'view' ? 'views' : 'downloads'} + 1 WHERE id = ?`).bind(r.id).run();
  if (ctx) await audit(env, request, ctx, 'elibrary', mode === 'view' ? 'file.view' : 'file.download', 'resource', r.id, r.title);
  return fileResponse(obj, r, mode);
}

// GET /api/institution/resources/:id/file?mode=view|download  (signed-in)
export async function resourceFile({ request, env, params, url }) {
  try {
    const ctx = await getInstContext(request, env);
    if (ctx.error) return ctx.error;
    if (!ctx.inst) fail(403, 'You are not part of an institution yet.');
    const r = await env.DB.prepare('SELECT * FROM ins_resources WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
    if (!r || !levelAllowed(ctx, r.access_level)) fail(404, 'The resource could not be found.');
    const mode = url.searchParams.get('mode') === 'view' ? 'view' : 'download';
    return await serve(env, request, r, mode, ctx);
  } catch (e) { return errorResponse(e); }
}

// Public resources: only those explicitly marked "public", only when the institution is public.
export async function publicResourceFile({ request, env, params, url }) {
  try {
    const r = await env.DB.prepare(
      `SELECT r.* FROM ins_resources r JOIN ins_institutions i ON i.id = r.institution_id
       WHERE r.id = ? AND i.slug = ? AND i.is_public = 1 AND r.access_level = 'public' AND r.deleted_at IS NULL`).bind(params.id, params.slug).first();
    if (!r) fail(404, 'The resource could not be found.');
    const mode = url.searchParams.get('mode') === 'view' ? 'view' : 'download';
    return await serve(env, request, r, mode, null);
  } catch (e) { return errorResponse(e); }
}

export async function resourceThumb({ request, env, params }) {
  try {
    const r = await env.DB.prepare(
      `SELECT r.thumb_key, r.institution_id, r.access_level, i.is_public FROM ins_resources r JOIN ins_institutions i ON i.id = r.institution_id WHERE r.id = ? AND r.deleted_at IS NULL`).bind(params.id).first();
    if (!r || !r.thumb_key) return new Response('Not found', { status: 404 });
    if (!(r.access_level === 'public' && r.is_public)) {
      const ctx = await getInstContext(request, env);
      if (ctx.error || !ctx.inst || ctx.inst.id !== r.institution_id || !levelAllowed(ctx, r.access_level)) return new Response('Not found', { status: 404 });
    }
    return imageResponse(env, r.thumb_key);
  } catch (e) { return new Response('Not found', { status: 404 }); }
}
