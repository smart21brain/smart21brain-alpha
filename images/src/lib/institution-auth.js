// Smart21Institution — shared tenant, role and helper library.
//
// Accounts are the normal smart21brain accounts (users + sessions tables).
// What a person may do INSIDE an institution comes from ins_members (which
// institution, which role) and ins_role_permissions (what each role can do —
// every institution can change this from Settings). Permissions are checked
// here on the server for every request; the browser only hides buttons.
// Every institution-scoped query must include `institution_id = ctx.inst.id`.
//
// Generic helpers (validation, image upload, errors) are shared with the
// School System so all systems behave the same way.

import { getSessionUser, json } from './auth.js';
import { queueChannels, flushOutbox, channelsConfigured, outboxState } from './institution-channels.js';
import {
  HttpError, fail, V, readJson, safeJson, likeTerm, chunk, paging,
  storeImage, imageResponse, randomToken, errorResponse, assertSameOrigin,
} from './school-auth.js';

export {
  HttpError, fail, V, readJson, safeJson, likeTerm, chunk, paging,
  storeImage, imageResponse, randomToken, errorResponse, assertSameOrigin,
};

export const ROLES = ['super_admin', 'admin', 'librarian', 'staff', 'teacher', 'student'];
export const ROLE_LABELS = {
  super_admin: 'Super Administrator', admin: 'Administrator', librarian: 'Librarian',
  staff: 'Staff', teacher: 'Teacher / Lecturer', student: 'Student',
};

// Permission catalogue — also sent to the UI to draw the Roles & Permissions
// screen, so a new permission only has to be added here.
export const PERMISSIONS = [
  { group: 'Library',   key: 'books.view',       label: 'View the library catalogue (staff view)' },
  { group: 'Library',   key: 'books.manage',     label: 'Add, edit, archive & delete books' },
  { group: 'Library',   key: 'loans.view',       label: 'View all loans & reservations' },
  { group: 'Library',   key: 'loans.manage',     label: 'Issue, return, renew & reserve books' },
  { group: 'Library',   key: 'fines.manage',     label: 'Manage fines (collect, waive)' },
  { group: 'E-Library', key: 'resources.view',   label: 'Open digital resources (as allowed by each resource)' },
  { group: 'E-Library', key: 'resources.manage', label: 'Upload, edit & delete digital resources' },
  { group: 'People',    key: 'students.view',    label: 'View student records' },
  { group: 'People',    key: 'students.manage',  label: 'Add, edit & delete student records' },
  { group: 'People',    key: 'staff.view',       label: 'View staff records' },
  { group: 'People',    key: 'staff.manage',     label: 'Add, edit & delete staff records' },
  { group: 'Academics', key: 'academics.view',   label: 'View courses, enrolment & results' },
  { group: 'Academics', key: 'academics.manage', label: 'Manage programmes, courses & enrolment' },
  { group: 'Academics', key: 'results.enter',    label: 'Enter & change marks (teachers: own courses only)' },
  { group: 'Academics', key: 'results.all',      label: 'Enter & change marks for any course' },
  { group: 'System',    key: 'announcements.manage', label: 'Post & delete announcements' },
  { group: 'Website',   key: 'site.manage',      label: 'Build & publish the institution website (pages, news, design)' },
  { group: 'Website',   key: 'applications.manage', label: 'Review online applications & website messages' },
  { group: 'System',    key: 'reports.view',     label: 'View & export reports' },
  { group: 'System',    key: 'import.manage',    label: 'Import records from CSV / Excel' },
  { group: 'System',    key: 'users.manage',     label: 'Manage logins & roles' },
  { group: 'System',    key: 'settings.manage',  label: 'Change institution settings' },
  { group: 'System',    key: 'permissions.manage', label: 'Change what each role can do' },
  { group: 'System',    key: 'audit.view',       label: 'View the audit log' },
  { group: 'System',    key: 'backup.manage',    label: 'Create, verify & download backups' },
  { group: 'System',    key: 'health.view',      label: 'View system health' },
];
export const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

const ADMIN_PERMS = ALL_PERMISSION_KEYS.filter((k) => !['permissions.manage', 'backup.manage'].includes(k));
export const DEFAULT_ROLE_PERMISSIONS = {
  super_admin: ALL_PERMISSION_KEYS,
  admin: ADMIN_PERMS,
  librarian: ['books.view', 'books.manage', 'loans.view', 'loans.manage', 'fines.manage', 'resources.view', 'resources.manage',
    'students.view', 'staff.view', 'announcements.manage', 'reports.view', 'import.manage'],
  staff: ['books.view', 'resources.view', 'students.view', 'staff.view', 'academics.view', 'reports.view'],
  teacher: ['books.view', 'resources.view', 'students.view', 'academics.view', 'results.enter', 'reports.view'],
  student: ['resources.view'],
};

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const DEFAULT_GRADING = [
  { min: 80, grade: 'A', points: 5 }, { min: 70, grade: 'B', points: 4 }, { min: 60, grade: 'C', points: 3 },
  { min: 50, grade: 'D', points: 2 }, { min: 40, grade: 'E', points: 1 }, { min: 0, grade: 'F', points: 0 },
];
export function gradeFor(marks, scale) {
  const list = (Array.isArray(scale) && scale.length ? scale : DEFAULT_GRADING).slice().sort((a, b) => b.min - a.min);
  return list.find((g) => marks >= g.min) || list[list.length - 1];
}

// ---------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------
export async function getInstContext(request, env) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return { error: json({ error: 'Please sign in to continue.', code: 'unauthorized' }, { status: 401 }) };

  const url = new URL(request.url);
  const wanted = Number(request.headers.get('X-Institution-Id') || url.searchParams.get('institution_id') || 0);

  const sql = `SELECT m.id AS member_id, m.role, m.student_id AS m_student_id, m.staff_id AS m_staff_id, i.*
               FROM ins_members m JOIN ins_institutions i ON i.id = m.institution_id
               WHERE m.user_id = ? AND m.active = 1 ${wanted ? 'AND m.institution_id = ?' : ''}
               ORDER BY m.id ASC LIMIT 1`;
  let row = await (wanted ? env.DB.prepare(sql).bind(user.id, wanted) : env.DB.prepare(sql).bind(user.id)).first();
  if (!row && wanted) row = await env.DB.prepare(sql.replace('AND m.institution_id = ?', '')).bind(user.id).first();

  const ctx = { user, inst: null, role: null, perms: new Set(), off: 180, studentId: null, staffId: null };
  if (!row) return ctx;

  ctx.inst = {
    id: row.id, name: row.name, short_name: row.short_name, slug: row.slug, inst_type: row.inst_type, about: row.about,
    logo_key: row.logo_key, phone: row.phone, email: row.email, address: row.address, website: row.website,
    currency: row.currency, primary_color: row.primary_color, utc_offset_min: Number.isInteger(row.utc_offset_min) ? row.utc_offset_min : 180,
    is_public: row.is_public,
  };
  ctx.off = ctx.inst.utc_offset_min;
  ctx.role = row.role;
  ctx.studentId = row.m_student_id || null;
  ctx.staffId = row.m_staff_id || null;

  if (ctx.role === 'super_admin') {
    ALL_PERMISSION_KEYS.forEach((k) => ctx.perms.add(k));   // the owner can never be locked out
  } else {
    const { results } = await env.DB.prepare(
      'SELECT permission FROM ins_role_permissions WHERE institution_id = ? AND role = ?'
    ).bind(ctx.inst.id, ctx.role).all();
    results.forEach((r) => ctx.perms.add(r.permission));
  }
  return ctx;
}

export const can = (ctx, perm) => ctx.role === 'super_admin' || ctx.perms.has(perm);

// Wraps a handler: sign-in check, tenant check, permission check, CSRF-style
// origin check on writes, and turns thrown HttpErrors into JSON responses.
//   opts.perm    one permission key, or an array meaning "any of these"
//   opts.roles   restrict to these roles
//   opts.inst    false = endpoint works even before an institution exists
export function secure(opts, fn) {
  if (typeof opts === 'function') { fn = opts; opts = {}; }
  return async ({ request, env, params, url, ctx: exec }) => {
    try {
      const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
      if (isWrite) assertSameOrigin(request);
      const ctx = await getInstContext(request, env);
      if (ctx.error) return ctx.error;
      if (!ctx.inst) {
        if (opts.inst === false) return await fn({ request, env, params, url, ctx });
        return json({ error: 'You are not part of an institution yet.', code: 'no_institution' }, { status: 403 });
      }
      if (opts.roles && !opts.roles.includes(ctx.role)) fail(403, 'You do not have permission to perform this action.');
      if (opts.perm) {
        const list = Array.isArray(opts.perm) ? opts.perm : [opts.perm];
        if (!list.some((p) => can(ctx, p))) fail(403, 'You do not have permission to perform this action.');
      }

      // Offline work: a change typed while offline is sent again later with the same X-Client-Op-Id.
      // If that operation already succeeded (the answer was lost on the way), return the saved answer instead of doing it twice.
      const opId = isWrite && ctx.user ? (request.headers.get('X-Client-Op-Id') || '') : '';
      const validOp = /^[A-Za-z0-9_-]{8,64}$/.test(opId);
      if (validOp) {
        const seen = await env.DB.prepare('SELECT status, body FROM ins_client_ops WHERE institution_id = ? AND user_id = ? AND op_id = ?').bind(ctx.inst.id, ctx.user.id, opId).first();
        if (seen) return new Response(seen.body || '{"ok":true}', { status: seen.status, headers: { 'Content-Type': 'application/json', 'X-Replayed': '1' } });
      }
      const res = await fn({ request, env, params, url, ctx });
      if (validOp && res && res.status >= 200 && res.status < 300) {
        try {
          const text = await res.clone().text();
          await env.DB.prepare('INSERT OR IGNORE INTO ins_client_ops (institution_id, user_id, op_id, status, body) VALUES (?, ?, ?, ?, ?)').bind(ctx.inst.id, ctx.user.id, opId, res.status, text.length < 20000 ? text : '{"ok":true}').run();
        } catch (e) { /* the real action already happened; never fail it for bookkeeping */ }
      }
      // Notices created during this request are delivered (e-mail / SMS / push) right after the answer is sent.
      if (isWrite && outboxState.dirty && exec && exec.waitUntil) {
        outboxState.dirty = false;
        exec.waitUntil(flushOutbox(env, { origin: new URL(request.url).origin }).catch(() => {}));
      }
      return res;
    } catch (e) {
      return errorResponse(e);
    }
  };
}

// ---------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------
export const DEFAULT_SETTINGS = {
  loan_days_student: 14, loan_days_staff: 30,
  max_loans_student: 3, max_loans_staff: 10,
  max_renewals: 2, renewal_days: 7,
  fine_per_day: 200, lost_fine_multiplier: 1, damaged_fine: 2000,
  reservation_hold_days: 3,
  student_prefix: 'STU', staff_prefix: 'STF', accession_prefix: 'ACC',
  grading_scale: DEFAULT_GRADING,
  max_upload_mb: 20,
  notify_email: 1, notify_sms: 0, notify_push: 1,        // institution-wide switches for the channels the server has set up
};

export async function getSettings(env, instId) {
  const { results } = await env.DB.prepare('SELECT key, value FROM ins_settings WHERE institution_id = ?').bind(instId).all();
  const raw = {};
  results.forEach((r) => { raw[r.key] = safeJson(r.value, r.value); });
  const out = { ...DEFAULT_SETTINGS };
  for (const k of Object.keys(DEFAULT_SETTINGS)) {
    if (raw[k] === undefined || raw[k] === null) continue;
    if (k === 'grading_scale') { if (Array.isArray(raw[k]) && raw[k].length) out[k] = raw[k]; }
    else if (typeof DEFAULT_SETTINGS[k] === 'number') { if (Number.isFinite(Number(raw[k]))) out[k] = Number(raw[k]); }
    else if (typeof raw[k] === 'string' && raw[k]) out[k] = raw[k];
  }
  return out;
}

export async function saveSetting(env, instId, key, value) {
  await env.DB.prepare(
    `INSERT INTO ins_settings (institution_id, key, value) VALUES (?, ?, ?)
     ON CONFLICT(institution_id, key) DO UPDATE SET value = excluded.value`
  ).bind(instId, key, JSON.stringify(value)).run();
}

// ---------------------------------------------------------------------
// Dates in the institution's own time zone (SQLite stores UTC)
// ---------------------------------------------------------------------
export const localToday = (off) => new Date(Date.now() + (Number(off) | 0) * 60000).toISOString().slice(0, 10);
export const addDays = (ymd, n) => new Date(Date.parse(ymd + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
export const daysBetween = (fromYmd, toYmd) => Math.round((Date.parse(toYmd + 'T00:00:00Z') - Date.parse(fromYmd + 'T00:00:00Z')) / 86400000);

// ---------------------------------------------------------------------
// Audit & notifications
// ---------------------------------------------------------------------
export async function audit(env, request, ctx, module, action, entity, entityId, details, status = 'success') {
  try {
    await env.DB.prepare(
      `INSERT INTO ins_audit_logs (institution_id, user_id, module, action, entity, entity_id, details, status, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      ctx.inst.id, ctx.user ? ctx.user.id : null, module || null, action, entity || null, entityId || null,
      details == null ? null : String(typeof details === 'string' ? details : JSON.stringify(details)).slice(0, 1000), status,
      request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || null,
      (request.headers.get('User-Agent') || '').slice(0, 250) || null
    ).run();
  } catch (e) { /* an audit failure must never break the real action */ }
}

// kind: system | overdue | announcement | academic | admin | security
// Channels (email / SMS / push) can be plugged in here later: every notification
// in the system goes through this one function.
// opts.sms: true = also text this one (e.g. "your reserved book is ready"); false = never text it.
// Without opts, SMS is only used for overdue / security / academic notices (SMS costs money).
export async function notify(env, instId, userId, kind, title, message, link, opts = {}) {
  try {
    const r = await env.DB.prepare(
      'INSERT INTO ins_notifications (institution_id, user_id, kind, title, message, link) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(instId, userId, kind, String(title).slice(0, 160), message ? String(message).slice(0, 500) : null, link || null).run();
    if (channelsConfigured(env) && await queueChannels(env, instId, userId, r.meta.last_row_id, kind, opts.sms)) outboxState.dirty = true;
  } catch (e) { /* never block the real action */ }
}

// Login user id for a borrower (student / staff record), if they have a login.
export async function userIdForBorrower(env, instId, type, id) {
  const col = type === 'student' ? 'student_id' : 'staff_id';
  const r = await env.DB.prepare(`SELECT user_id FROM ins_members WHERE institution_id = ? AND ${col} = ? AND active = 1 LIMIT 1`).bind(instId, id).first();
  return r ? r.user_id : null;
}

export async function nextNumber(env, instId, table, col, prefix, padTo = 4) {
  const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE institution_id = ?`).bind(instId).first();
  let n = (r?.n || 0) + 1;
  for (let i = 0; i < 50; i++, n++) {
    const no = `${prefix}-${String(n).padStart(padTo, '0')}`;
    const hit = await env.DB.prepare(`SELECT 1 AS x FROM ${table} WHERE institution_id = ? AND ${col} = ?`).bind(instId, no).first();
    if (!hit) return no;
  }
  return `${prefix}-${Date.now()}`;
}

export const slugify = (text) => String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'institution';
