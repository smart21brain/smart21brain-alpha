// Smart21Institution — data import (validate → confirm → import) and backup / restore.
import { json } from '../../lib/auth.js';
import {
  HttpError, fail, secure, readJson, V, audit, getSettings, likeTerm, chunk, paging, localToday, errorResponse, randomToken,
} from '../../lib/institution-auth.js';
import { readBook, addCopies } from './library.js';
import { readStudent, readStaff, insertStudent, insertStaff } from './people.js';

const MAX_IMPORT_ROWS = 500;
const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();

// Import columns the UI offers for mapping (key → label)
export const IMPORT_FIELDS = {
  books: [['title', 'Title', 1], ['author', 'Author', 1], ['isbn', 'ISBN'], ['publisher', 'Publisher'], ['pub_year', 'Publication year'], ['edition', 'Edition'], ['category', 'Category'], ['subject', 'Subject'],
    ['language', 'Language'], ['copies', 'Number of copies'], ['shelf', 'Shelf / location'], ['classification_no', 'Classification number'], ['description', 'Description'], ['price', 'Price'], ['acquisition_date', 'Acquisition date'], ['acquisition_source', 'Acquisition source'], ['notes', 'Notes']],
  students: [['full_name', 'Full name', 1], ['student_no', 'Student ID'], ['reg_no', 'Registration number'], ['gender', 'Gender'], ['dob', 'Date of birth'], ['phone', 'Phone'], ['email', 'Email'], ['address', 'Address'],
    ['programme', 'Programme'], ['department', 'Department'], ['class_name', 'Class'], ['level', 'Year / level'], ['admission_date', 'Admission date'], ['status', 'Status'], ['guardian_name', 'Guardian name'], ['guardian_phone', 'Guardian phone'], ['guardian_relation', 'Guardian relationship']],
  staff: [['full_name', 'Full name', 1], ['staff_no', 'Staff number'], ['gender', 'Gender'], ['phone', 'Phone'], ['email', 'Email'], ['position', 'Position'], ['department', 'Department'], ['hired_on', 'Hire date'], ['status', 'Status']],
};

export const importFields = secure({ perm: 'import.manage' }, async () => json({
  fields: Object.fromEntries(Object.entries(IMPORT_FIELDS).map(([k, v]) => [k, v.map(([key, label, req]) => ({ key, label, required: !!req }))])), max_rows: MAX_IMPORT_ROWS,
}));

async function lookupMaps(env, instId) {
  const q = (sql) => env.DB.prepare(sql).bind(instId).all().then((r) => r.results);
  const [cats, progs, depts, isbns, studentNos, staffNos] = await Promise.all([
    q('SELECT id, name FROM ins_categories WHERE institution_id = ?'), q('SELECT id, name FROM ins_programmes WHERE institution_id = ?'), q('SELECT id, name FROM ins_departments WHERE institution_id = ?'),
    q(`SELECT isbn FROM ins_books WHERE institution_id = ? AND deleted_at IS NULL AND isbn IS NOT NULL`), q('SELECT student_no FROM ins_students WHERE institution_id = ?'), q('SELECT staff_no FROM ins_staff WHERE institution_id = ?'),
  ]);
  const by = (list) => new Map(list.map((r) => [norm(r.name), r.id]));
  return { cats: by(cats), progs: by(progs), depts: by(depts), isbns: new Set(isbns.map((r) => r.isbn)), studentNos: new Set(studentNos.map((r) => norm(r.student_no))), staffNos: new Set(staffNos.map((r) => norm(r.staff_no))) };
}

// Validate every row on the server. Returns [{ row, data?, errors[] }]
function validateRows(kind, rows, maps) {
  const seenIsbn = new Set(); const seenNo = new Set(); const out = [];
  rows.forEach((raw, i) => {
    const errors = []; let data = null;
    try {
      if (kind === 'books') {
        const r = { ...raw };
        if (r.category) { const id = maps.cats.get(norm(r.category)); r.category_id = id || null; }
        data = readBook(r);
        data.category_name = r.category ? String(r.category).trim() : null;
        data.copies = V.int(raw.copies === '' || raw.copies == null ? 1 : raw.copies, 'Number of copies', { min: 1, max: 200 });
        if (data.isbn) {
          if (maps.isbns.has(data.isbn)) errors.push('This ISBN is already in the catalogue.');
          else if (seenIsbn.has(data.isbn)) errors.push('This ISBN appears twice in the file.');
          seenIsbn.add(data.isbn);
        }
      } else if (kind === 'students') {
        const r = { ...raw };
        if (r.programme) { const id = maps.progs.get(norm(r.programme)); if (!id) errors.push(`Programme "${r.programme}" does not exist. Create it first in Settings.`); r.programme_id = id || null; }
        if (r.department) { const id = maps.depts.get(norm(r.department)); if (!id) errors.push(`Department "${r.department}" does not exist. Create it first in Settings.`); r.department_id = id || null; }
        if (r.gender) r.gender = norm(r.gender).replace(/^m$/, 'male').replace(/^f$/, 'female');
        data = readStudent(r);
        if (data.student_no) {
          const k = norm(data.student_no);
          if (maps.studentNos.has(k)) errors.push(`Student ID ${data.student_no} already exists.`);
          else if (seenNo.has(k)) errors.push(`Student ID ${data.student_no} appears twice in the file.`);
          seenNo.add(k);
        }
      } else {
        const r = { ...raw };
        if (r.department) { const id = maps.depts.get(norm(r.department)); if (!id) errors.push(`Department "${r.department}" does not exist. Create it first in Settings.`); r.department_id = id || null; }
        if (r.gender) r.gender = norm(r.gender).replace(/^m$/, 'male').replace(/^f$/, 'female');
        data = readStaff(r);
        if (data.staff_no) {
          const k = norm(data.staff_no);
          if (maps.staffNos.has(k)) errors.push(`Staff number ${data.staff_no} already exists.`);
          else if (seenNo.has(k)) errors.push(`Staff number ${data.staff_no} appears twice in the file.`);
          seenNo.add(k);
        }
      }
    } catch (e) { errors.push(e instanceof HttpError ? e.message : 'This row could not be read.'); }
    out.push({ row: i + 1, data: errors.length ? null : data, errors });
  });
  return out;
}

function readImportBody(b) {
  const kind = V.oneOf(b.kind, 'Import type', ['books', 'students', 'staff'], { required: true });
  if (!Array.isArray(b.rows) || !b.rows.length) fail(400, 'The file has no rows to import.');
  if (b.rows.length > MAX_IMPORT_ROWS) fail(400, `Please import at most ${MAX_IMPORT_ROWS} rows at a time. Split the file and import it in parts.`);
  const allowed = new Set(IMPORT_FIELDS[kind].map((f) => f[0]));
  const rows = b.rows.map((r) => { const o = {}; for (const k of Object.keys(r || {})) if (allowed.has(k)) o[k] = r[k] == null ? '' : String(r[k]); return o; });
  return { kind, rows, filename: V.str(b.filename, 'File name', { max: 120 }) };
}

// Step 1 — check the file (writes nothing)
export const importValidate = secure({ perm: 'import.manage' }, async ({ env, request, ctx }) => {
  const { kind, rows } = readImportBody(await readJson(request));
  const res = validateRows(kind, rows, await lookupMaps(env, ctx.inst.id));
  const bad = res.filter((r) => r.errors.length);
  const preview = res.slice(0, 8).map((r) => ({ row: r.row, ok: !r.errors.length, ...rows[r.row - 1] }));
  return json({ total: rows.length, valid: rows.length - bad.length, invalid: bad.length, errors: bad.slice(0, 200).map((r) => ({ row: r.row, errors: r.errors })), preview });
});

// Step 2 — import the valid rows (everything is validated again here)
export const importCommit = secure({ perm: 'import.manage' }, async ({ env, request, ctx }) => {
  const b = await readJson(request);
  const { kind, rows, filename } = readImportBody(b);
  const maps = await lookupMaps(env, ctx.inst.id);
  const res = validateRows(kind, rows, maps);
  const bad = res.filter((r) => r.errors.length);
  if (bad.length && !b.skip_invalid) fail(400, `${bad.length} row(s) have errors. Fix them, or choose to skip the invalid rows.`);
  let done = 0; const failed = [];
  for (const r of res.filter((x) => !x.errors.length)) {
    try {
      if (kind === 'books') {
        const d = r.data;
        let catId = d.category_id;
        if (!catId && d.category_name) {
          await env.DB.prepare('INSERT OR IGNORE INTO ins_categories (institution_id, name) VALUES (?, ?)').bind(ctx.inst.id, d.category_name).run();
          const c = await env.DB.prepare('SELECT id FROM ins_categories WHERE institution_id = ? AND name = ? COLLATE NOCASE').bind(ctx.inst.id, d.category_name).first();
          catId = c ? c.id : null;
        }
        const ins = await env.DB.prepare(
          `INSERT INTO ins_books (institution_id, isbn, title, author, publisher, pub_year, edition, category_id, subject, language, description, shelf, classification_no, acquisition_date, acquisition_source, price, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(ctx.inst.id, d.isbn, d.title, d.author, d.publisher, d.pub_year, d.edition, catId, d.subject, d.language, d.description, d.shelf, d.classification_no, d.acquisition_date, d.acquisition_source, d.price, d.notes).run();
        await addCopies(env, ctx, ins.meta.last_row_id, d.copies);
      } else if (kind === 'students') await insertStudent(env, ctx, r.data);
      else await insertStaff(env, ctx, r.data);
      done++;
    } catch (e) { failed.push({ row: r.row, errors: [e instanceof HttpError ? e.message : 'Could not be saved.'] }); }
  }
  const skipped = rows.length - done;
  await env.DB.prepare('INSERT INTO ins_imports (institution_id, kind, filename, total_rows, imported_rows, skipped_rows, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(ctx.inst.id, kind, filename, rows.length, done, skipped, ctx.user.id).run();
  await audit(env, request, ctx, 'import', `import.${kind}`, 'import', null, `${done} imported, ${skipped} skipped (${filename || 'file'})`);
  return json({ ok: true, total: rows.length, imported: done, skipped, errors: [...bad.map((r) => ({ row: r.row, errors: r.errors })), ...failed].slice(0, 200) });
});

export const importHistory = secure({ perm: 'import.manage' }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(`SELECT i.id, i.kind, i.filename, i.total_rows, i.imported_rows, i.skipped_rows, i.created_at, u.name AS user FROM ins_imports i LEFT JOIN users u ON u.id = i.user_id WHERE i.institution_id = ? ORDER BY i.id DESC LIMIT 20`).bind(ctx.inst.id).all();
  return json({ imports: results });
});

// ---------------------------------------------------------------------
// Backup & restore
// ---------------------------------------------------------------------
// Insert order respects foreign keys; deletion runs in the reverse order.
const BACKUP_TABLES = [
  'ins_departments', 'ins_programmes', 'ins_academic_years', 'ins_terms', 'ins_staff', 'ins_students', 'ins_courses', 'ins_teaching', 'ins_enrollments', 'ins_results',
  'ins_categories', 'ins_books', 'ins_book_copies', 'ins_loans', 'ins_reservations', 'ins_fines', 'ins_resource_categories', 'ins_resources', 'ins_announcements',
];
const MAX_ROWS_PER_TABLE = 50000;
const KEEP_BACKUPS = 10;

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function sha256(text) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))); }

export async function createBackup(env, instId, userId) {
  if (!env.MATERIALS) fail(500, 'File storage is not configured, so backups cannot be saved.');
  const data = {}; const counts = {};
  for (const t of BACKUP_TABLES) {
    const { results } = await env.DB.prepare(`SELECT * FROM ${t} WHERE institution_id = ? LIMIT ${MAX_ROWS_PER_TABLE + 1}`).bind(instId).all();
    if (results.length > MAX_ROWS_PER_TABLE) fail(413, 'This institution is too large for a one-file backup. Please contact support.');
    data[t] = results; counts[t] = results.length;
  }
  const inst = await env.DB.prepare('SELECT name, short_name, slug, inst_type, currency FROM ins_institutions WHERE id = ?').bind(instId).first();
  const { results: settings } = await env.DB.prepare('SELECT key, value FROM ins_settings WHERE institution_id = ?').bind(instId).all();
  const { results: perms } = await env.DB.prepare('SELECT role, permission FROM ins_role_permissions WHERE institution_id = ?').bind(instId).all();
  const payload = JSON.stringify({ app: 'Smart21Institution', format: 1, created: new Date().toISOString(), institution: inst, tables: data, settings, role_permissions: perms });
  const checksum = await sha256(payload);
  const key = `institution/${instId}/backups/${new Date().toISOString().replace(/[:.]/g, '-')}-${randomToken(4)}.json`;
  await env.MATERIALS.put(key, payload, { httpMetadata: { contentType: 'application/json' } });
  const r = await env.DB.prepare('INSERT INTO ins_backups (institution_id, file_key, size_bytes, row_counts, checksum, created_by) VALUES (?, ?, ?, ?, ?, ?)').bind(instId, key, payload.length, JSON.stringify(counts), checksum, userId || null).run();
  // keep only the most recent backups
  const { results: old } = await env.DB.prepare('SELECT id, file_key FROM ins_backups WHERE institution_id = ? ORDER BY id DESC LIMIT -1 OFFSET ?').bind(instId, KEEP_BACKUPS).all();
  for (const o of old) { await env.MATERIALS.delete(o.file_key).catch(() => {}); await env.DB.prepare('DELETE FROM ins_backups WHERE id = ?').bind(o.id).run(); }
  return { id: r.meta.last_row_id, size_bytes: payload.length, counts };
}

// Scheduled (daily cron): back up every institution whose last backup is older than 7 days.
export async function runScheduledBackups(env) {
  const { results } = await env.DB.prepare(
    `SELECT i.id FROM ins_institutions i WHERE COALESCE((SELECT MAX(created_at) FROM ins_backups b WHERE b.institution_id = i.id), '2000-01-01') < datetime('now','-7 days') LIMIT 20`
  ).all();
  for (const i of results) {
    try { await createBackup(env, i.id, null); await env.DB.prepare(`INSERT INTO ins_audit_logs (institution_id, module, action, details) VALUES (?, 'backup', 'backup.scheduled', 'Weekly automatic backup')`).bind(i.id).run(); }
    catch (e) { await env.DB.prepare(`INSERT INTO ins_audit_logs (institution_id, module, action, details, status) VALUES (?, 'backup', 'backup.scheduled', 'Automatic backup failed', 'failed')`).bind(i.id).run().catch(() => {}); }
  }
}

export const listBackups = secure({ perm: 'backup.manage' }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(`SELECT b.id, b.size_bytes, b.row_counts, b.checksum, b.verified_at, b.verified_ok, b.created_at, u.name AS created_by FROM ins_backups b LEFT JOIN users u ON u.id = b.created_by WHERE b.institution_id = ? ORDER BY b.id DESC`).bind(ctx.inst.id).all();
  return json({ backups: results.map((b) => ({ ...b, row_counts: JSON.parse(b.row_counts || '{}'), checksum: b.checksum.slice(0, 12) })), keep: KEEP_BACKUPS });
});

export const makeBackup = secure({ perm: 'backup.manage' }, async ({ request, env, ctx }) => {
  const r = await createBackup(env, ctx.inst.id, ctx.user.id);
  await audit(env, request, ctx, 'backup', 'backup.create', 'backup', r.id, `${Math.round(r.size_bytes / 1024)} KB`);
  return json({ ok: true, ...r }, { status: 201 });
});

async function loadBackupFile(env, ctx, id) {
  const b = await env.DB.prepare('SELECT * FROM ins_backups WHERE id = ? AND institution_id = ?').bind(id, ctx.inst.id).first();
  if (!b) fail(404, 'The backup could not be found.');
  const obj = env.MATERIALS ? await env.MATERIALS.get(b.file_key) : null;
  return { b, obj };
}

// Verify: re-read the stored file, recompute the checksum, parse it, compare the row counts.
export const verifyBackup = secure({ perm: 'backup.manage' }, async ({ request, env, params, ctx }) => {
  const { b, obj } = await loadBackupFile(env, ctx, params.id);
  let ok = false; let detail = 'The backup file is missing from storage.';
  if (obj) {
    const text = await obj.text();
    if ((await sha256(text)) !== b.checksum) detail = 'The file does not match its checksum — it may be damaged.';
    else {
      try {
        const parsed = JSON.parse(text); const want = JSON.parse(b.row_counts || '{}');
        const mismatch = BACKUP_TABLES.filter((t) => (parsed.tables?.[t]?.length ?? -1) !== want[t]);
        ok = !mismatch.length; detail = ok ? 'The file is complete and readable. It can be restored.' : `Row counts differ for: ${mismatch.join(', ')}.`;
      } catch (e) { detail = 'The file could not be read.'; }
    }
  }
  await env.DB.prepare(`UPDATE ins_backups SET verified_at = datetime('now'), verified_ok = ? WHERE id = ?`).bind(ok ? 1 : 0, b.id).run();
  await audit(env, request, ctx, 'backup', 'backup.verify', 'backup', b.id, detail, ok ? 'success' : 'failed');
  return json({ ok, detail });
});

export const downloadBackup = secure({ perm: 'backup.manage' }, async ({ request, env, params, ctx }) => {
  const { b, obj } = await loadBackupFile(env, ctx, params.id);
  if (!obj) fail(404, 'The backup file is missing from storage.');
  await audit(env, request, ctx, 'backup', 'backup.download', 'backup', b.id, null);
  return new Response(obj.body, { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${ctx.inst.slug}-backup-${b.created_at.slice(0, 10)}.json"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
});

export const deleteBackup = secure({ perm: 'backup.manage' }, async ({ request, env, params, ctx }) => {
  const { b } = await loadBackupFile(env, ctx, params.id);
  if (env.MATERIALS) await env.MATERIALS.delete(b.file_key).catch(() => {});
  await env.DB.prepare('DELETE FROM ins_backups WHERE id = ?').bind(b.id).run();
  await audit(env, request, ctx, 'backup', 'backup.delete', 'backup', b.id, null);
  return json({ ok: true });
});

// Restore: replaces this institution's records with the backup. Super Administrator only.
// A safety backup of the current data is taken first, and the file is verified before anything is deleted.
export const restoreBackup = secure({ perm: 'backup.manage', roles: ['super_admin'] }, async ({ request, env, params, ctx }) => {
  const body = await readJson(request);
  if (String(body.confirm || '').trim() !== 'RESTORE') fail(400, 'Type RESTORE to confirm.');
  const { b, obj } = await loadBackupFile(env, ctx, params.id);
  if (!obj) fail(404, 'The backup file is missing from storage.');
  const text = await obj.text();
  if ((await sha256(text)) !== b.checksum) fail(409, 'This backup failed its integrity check and cannot be restored.');
  const parsed = JSON.parse(text);
  if (parsed.app !== 'Smart21Institution' || !parsed.tables) fail(409, 'This is not a valid Smart21Institution backup.');

  // allowed columns per table, taken from the live schema — never from the file
  const cols = {};
  for (const t of BACKUP_TABLES) {
    const { results } = await env.DB.prepare(`PRAGMA table_info(${t})`).all();
    cols[t] = new Set(results.map((c) => c.name));
  }
  const safety = await createBackup(env, ctx.inst.id, ctx.user.id);       // undo point

  for (const t of [...BACKUP_TABLES].reverse()) await env.DB.prepare(`DELETE FROM ${t} WHERE institution_id = ?`).bind(ctx.inst.id).run();
  let restored = 0;
  for (const t of BACKUP_TABLES) {
    const stmts = [];
    for (const row of parsed.tables[t] || []) {
      const keys = Object.keys(row).filter((k) => cols[t].has(k) && k !== 'institution_id');
      stmts.push(env.DB.prepare(`INSERT INTO ${t} (institution_id, ${keys.join(', ')}) VALUES (?${keys.map(() => ', ?').join('')})`).bind(ctx.inst.id, ...keys.map((k) => row[k])));
    }
    for (const part of chunk(stmts, 90)) await env.DB.batch(part);
    restored += stmts.length;
  }
  await audit(env, request, ctx, 'backup', 'backup.restore', 'backup', b.id, `${restored} records restored; safety backup #${safety.id}`);
  return json({ ok: true, restored, safety_backup_id: safety.id });
});
