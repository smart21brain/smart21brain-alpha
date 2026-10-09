// Smart21Brain School System — shared tenant, role and validation helpers.
//
// Accounts are the normal smart21brain accounts (users + sessions tables).
// What a person may do INSIDE a school comes from sch_members (which school,
// which role) and sch_role_permissions (what each role can do — every school
// can change this from Settings). Every school-scoped query must include
// `school_id = ctx.school.id`.

import { getSessionUser, json } from './auth.js';
import { DEFAULT_GRADING_SCALE, DEFAULT_DIVISION } from './school-calc.js';

export class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra || null;
  }
}
export const fail = (status, message, extra) => { throw new HttpError(status, message, extra); };

export const ROLES = ['admin', 'teacher', 'receptionist', 'parent'];

// Permission catalogue — also sent to the UI to draw the Roles & Permissions
// screen, so a new permission only has to be added here.
export const PERMISSIONS = [
  { group: 'Students', key: 'students.view',   label: 'View students' },
  { group: 'Students', key: 'students.create', label: 'Register students' },
  { group: 'Students', key: 'students.edit',   label: 'Edit students & change status' },
  { group: 'Students', key: 'students.delete', label: 'Delete students' },
  { group: 'Students', key: 'students.notes',  label: 'Add private notes about students' },
  { group: 'People',   key: 'parents.manage',  label: 'Manage parents / guardians' },
  { group: 'People',   key: 'teachers.manage', label: 'Manage teachers' },
  { group: 'Academics', key: 'classes.manage',  label: 'Manage classes' },
  { group: 'Academics', key: 'subjects.manage', label: 'Manage subjects' },
  { group: 'Academics', key: 'timetable.manage', label: 'Manage timetable' },
  { group: 'Attendance', key: 'attendance.take', label: 'Take attendance' },
  { group: 'Attendance', key: 'attendance.view', label: 'View attendance' },
  { group: 'Fees', key: 'fees.view',   label: 'View fees & payments' },
  { group: 'Fees', key: 'fees.record', label: 'Record payments & print receipts' },
  { group: 'Fees', key: 'fees.manage', label: 'Manage fee structures & edit payments' },
  { group: 'Exams', key: 'exams.manage',  label: 'Create examinations' },
  { group: 'Exams', key: 'results.enter', label: 'Enter examination marks' },
  { group: 'Exams', key: 'results.view',  label: 'View results & report cards' },
  { group: 'System', key: 'announcements.manage', label: 'Send announcements' },
  { group: 'System', key: 'reports.view',   label: 'View reports' },
  { group: 'System', key: 'users.manage',   label: 'Manage users' },
  { group: 'System', key: 'settings.manage', label: 'Change system settings' },
  { group: 'System', key: 'audit.view',     label: 'View audit logs' },
];
export const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

export const DEFAULT_ROLE_PERMISSIONS = {
  admin: ALL_PERMISSION_KEYS,
  teacher: ['students.view', 'students.notes', 'attendance.take', 'attendance.view', 'exams.manage', 'results.enter', 'results.view'],
  receptionist: ['students.view', 'students.create', 'students.edit', 'parents.manage', 'fees.view', 'fees.record', 'reports.view'],
  parent: [],
};

export const DEFAULT_PAYMENT_METHODS = ['Cash', 'Bank', 'Mobile Money', 'Card', 'Other'];

// ---------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------
export async function getSchoolContext(request, env) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return { error: json({ error: 'Please sign in to continue.', code: 'unauthorized' }, { status: 401 }) };

  const url = new URL(request.url);
  const wanted = Number(request.headers.get('X-School-Id') || url.searchParams.get('school_id') || 0);

  const sql = `SELECT m.id AS member_id, m.role, m.teacher_id, m.parent_id, s.*
               FROM sch_members m JOIN sch_schools s ON s.id = m.school_id
               WHERE m.user_id = ? AND m.active = 1 ${wanted ? 'AND m.school_id = ?' : ''}
               ORDER BY m.id ASC LIMIT 1`;
  let row = await (wanted ? env.DB.prepare(sql).bind(user.id, wanted) : env.DB.prepare(sql).bind(user.id)).first();
  if (!row && wanted) {
    // Stale or foreign school id: fall back to the person's own first school.
    row = await env.DB.prepare(sql.replace('AND m.school_id = ?', '')).bind(user.id).first();
  }

  const ctx = { user, school: null, role: null, perms: new Set(), teacherId: null, parentId: null, _cache: {} };
  if (!row) return ctx;

  ctx.school = {
    id: row.id, name: row.name, short_name: row.short_name, logo_key: row.logo_key, phone: row.phone,
    email: row.email, address: row.address, website: row.website, social: safeJson(row.social, {}),
    currency: row.currency, admission_prefix: row.admission_prefix, primary_color: row.primary_color,
    receipt_note: row.receipt_note,
  };
  ctx.role = row.role;
  ctx.teacherId = row.teacher_id || null;
  ctx.parentId = row.parent_id || null;

  if (ctx.role === 'admin') {
    ALL_PERMISSION_KEYS.forEach((k) => ctx.perms.add(k));
  } else {
    const { results } = await env.DB.prepare(
      'SELECT permission FROM sch_role_permissions WHERE school_id = ? AND role = ?'
    ).bind(ctx.school.id, ctx.role).all();
    results.forEach((r) => ctx.perms.add(r.permission));
  }
  return ctx;
}

export const can = (ctx, perm) => ctx.role === 'admin' || ctx.perms.has(perm);

// Wraps a handler: signs-in check, tenant check, permission check, CSRF-style
// origin check on writes, and turns thrown HttpErrors into JSON responses.
//   opts.perm     one permission key, or an array meaning "any of these"
//   opts.roles    restrict to these roles
//   opts.parent   allow the parent role (default: parents are refused)
//   opts.school   false = endpoint works even before a school exists
export function secure(opts, fn) {
  if (typeof opts === 'function') { fn = opts; opts = {}; }
  return async ({ request, env, params, url }) => {
    try {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) assertSameOrigin(request);
      const ctx = await getSchoolContext(request, env);
      if (ctx.error) return ctx.error;
      if (!ctx.school) {
        if (opts.school === false) return await fn({ request, env, params, url, ctx });
        return json({ error: 'You are not part of a school yet.', code: 'no_school' }, { status: 403 });
      }
      if (ctx.role === 'parent' && !opts.parent) fail(403, 'This area is not available to parents.');
      if (opts.roles && !opts.roles.includes(ctx.role)) fail(403, 'You do not have access to this.');
      if (opts.perm) {
        const list = Array.isArray(opts.perm) ? opts.perm : [opts.perm];
        if (!list.some((p) => can(ctx, p))) fail(403, 'You do not have permission to do this. Ask your school administrator.');
      }
      return await fn({ request, env, params, url, ctx });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export function errorResponse(e) {
  if (e instanceof HttpError) {
    return json({ error: e.message, ...(e.extra || {}) }, { status: e.status });
  }
  console.error(e);
  return json({ error: 'Something went wrong on our side. Please try again.', detail: String(e && e.message || e) }, { status: 500 });
}

export function assertSameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return;
  let ok = false;
  try { ok = new URL(origin).host === new URL(request.url).host; } catch (e) { ok = false; }
  if (!ok) fail(403, 'Blocked: this request came from another website.');
}

export async function readJson(request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') fail(400, 'The request was not understood (invalid data).');
  return body;
}

// Classes a teacher is responsible for (class teacher OR teaches a subject in it).
export async function teacherClassIds(env, ctx) {
  if (ctx._cache.tclasses) return ctx._cache.tclasses;
  if (!ctx.teacherId) return (ctx._cache.tclasses = []);
  const { results } = await env.DB.prepare(
    `SELECT id FROM sch_classes WHERE school_id = ? AND teacher_id = ?
     UNION SELECT class_id FROM sch_class_subjects WHERE school_id = ? AND teacher_id = ?`
  ).bind(ctx.school.id, ctx.teacherId, ctx.school.id, ctx.teacherId).all();
  return (ctx._cache.tclasses = results.map((r) => r.id));
}

// Child students of a parent login.
export async function parentStudentIds(env, ctx) {
  if (ctx._cache.pstudents) return ctx._cache.pstudents;
  if (!ctx.parentId) return (ctx._cache.pstudents = []);
  const { results } = await env.DB.prepare(
    `SELECT sp.student_id FROM sch_student_parents sp JOIN sch_students s ON s.id = sp.student_id
     WHERE sp.parent_id = ? AND s.school_id = ?`
  ).bind(ctx.parentId, ctx.school.id).all();
  return (ctx._cache.pstudents = results.map((r) => r.student_id));
}

// Throws unless the current person may see this student. Returns the student row.
export async function loadStudentForCtx(env, ctx, studentId) {
  const st = await env.DB.prepare('SELECT * FROM sch_students WHERE id = ? AND school_id = ?')
    .bind(studentId, ctx.school.id).first();
  if (!st) fail(404, 'Student not found.');
  if (ctx.role === 'parent') {
    if (!(await parentStudentIds(env, ctx)).includes(st.id)) fail(403, 'You can only see your own children.');
  } else if (ctx.role === 'teacher') {
    const cls = await env.DB.prepare(
      `SELECT class_id FROM sch_enrollments WHERE student_id = ? AND academic_year_id = (SELECT id FROM sch_academic_years WHERE school_id = ? AND is_current = 1)`
    ).bind(st.id, ctx.school.id).first();
    const allowed = await teacherClassIds(env, ctx);
    if (!cls || !allowed.includes(cls.class_id)) fail(403, 'This student is not in one of your classes.');
  }
  return st;
}

// ---------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------
export function safeJson(text, fallback) {
  if (text == null || text === '') return fallback;
  try { return JSON.parse(text); } catch (e) { return fallback; }
}

export async function getSettings(env, schoolId) {
  const { results } = await env.DB.prepare('SELECT key, value FROM sch_settings WHERE school_id = ?').bind(schoolId).all();
  const raw = {};
  results.forEach((r) => { raw[r.key] = safeJson(r.value, r.value); });
  return {
    payment_methods: Array.isArray(raw.payment_methods) && raw.payment_methods.length ? raw.payment_methods : DEFAULT_PAYMENT_METHODS,
    grading_scale: Array.isArray(raw.grading_scale) && raw.grading_scale.length ? raw.grading_scale : DEFAULT_GRADING_SCALE,
    division: raw.division && typeof raw.division === 'object' ? { ...DEFAULT_DIVISION, ...raw.division } : DEFAULT_DIVISION,
    absence_alert_threshold: Number(raw.absence_alert_threshold) > 0 ? Number(raw.absence_alert_threshold) : 3,
    receipt_footer: typeof raw.receipt_footer === 'string' ? raw.receipt_footer : 'Thank you for your payment. Fees paid are not refundable.',
    receipt_prefix: typeof raw.receipt_prefix === 'string' && raw.receipt_prefix ? raw.receipt_prefix : 'RCT',
    id_card_note: typeof raw.id_card_note === 'string' ? raw.id_card_note : 'If found, please return to the school office.',
  };
}

export async function saveSetting(env, schoolId, key, value) {
  await env.DB.prepare(
    `INSERT INTO sch_settings (school_id, key, value) VALUES (?, ?, ?)
     ON CONFLICT(school_id, key) DO UPDATE SET value = excluded.value`
  ).bind(schoolId, key, JSON.stringify(value)).run();
}

export async function currentYear(env, schoolId) {
  const y = await env.DB.prepare('SELECT * FROM sch_academic_years WHERE school_id = ? AND is_current = 1').bind(schoolId).first();
  if (y) return y;
  const any = await env.DB.prepare('SELECT * FROM sch_academic_years WHERE school_id = ? ORDER BY id DESC LIMIT 1').bind(schoolId).first();
  if (!any) fail(400, 'No academic year is set up yet. Add one in Settings → Academic Settings.');
  return any;
}

// ---------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------
export async function audit(env, request, ctx, action, entity, entityId, details) {
  try {
    await env.DB.prepare(
      `INSERT INTO sch_audit_logs (school_id, user_id, action, entity, entity_id, details, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      ctx.school.id, ctx.user ? ctx.user.id : null, action, entity || null, entityId || null,
      details == null ? null : String(typeof details === 'string' ? details : JSON.stringify(details)).slice(0, 1000),
      request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || null,
      (request.headers.get('User-Agent') || '').slice(0, 250) || null
    ).run();
  } catch (e) { /* an audit failure must never break the real action */ }
}

// ---------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------
const isBlank = (v) => v == null || (typeof v === 'string' && v.trim() === '');

export const V = {
  str(val, label, { required = false, max = 200, min = 0 } = {}) {
    if (isBlank(val)) { if (required) fail(400, `${label} is required.`); return null; }
    const s = String(val).trim();
    if (s.length < min) fail(400, `${label} must be at least ${min} characters.`);
    if (s.length > max) fail(400, `${label} is too long (maximum ${max} characters).`);
    return s;
  },
  oneOf(val, label, list, { required = false, def = null } = {}) {
    if (isBlank(val)) { if (required && def == null) fail(400, `${label} is required.`); return def; }
    const s = String(val).trim().toLowerCase();
    if (!list.includes(s)) fail(400, `${label} must be one of: ${list.join(', ')}.`);
    return s;
  },
  date(val, label, { required = false } = {}) {
    if (isBlank(val)) { if (required) fail(400, `${label} is required.`); return null; }
    const s = String(val).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s + 'T00:00:00Z'))) fail(400, `${label} must be a valid date (YYYY-MM-DD).`);
    return s;
  },
  time(val, label, { required = false } = {}) {
    if (isBlank(val)) { if (required) fail(400, `${label} is required.`); return null; }
    const s = String(val).trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) fail(400, `${label} must be a time like 08:00.`);
    return s;
  },
  int(val, label, { required = false, min = -Infinity, max = Infinity } = {}) {
    if (isBlank(val)) { if (required) fail(400, `${label} is required.`); return null; }
    const n = Number(val);
    if (!Number.isInteger(n) || n < min || n > max) fail(400, `${label} must be a whole number${min > -Infinity ? ` from ${min}` : ''}${max < Infinity ? ` to ${max}` : ''}.`);
    return n;
  },
  num(val, label, { required = false, min = -Infinity, max = Infinity } = {}) {
    if (isBlank(val)) { if (required) fail(400, `${label} is required.`); return null; }
    const n = Number(val);
    if (!Number.isFinite(n) || n < min || n > max) fail(400, `${label} must be a number${min > -Infinity ? ` of at least ${min}` : ''}${max < Infinity ? ` and at most ${max}` : ''}.`);
    return n;
  },
  email(val, label, { required = false } = {}) {
    if (isBlank(val)) { if (required) fail(400, `${label} is required.`); return null; }
    const s = String(val).trim().toLowerCase();
    if (s.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) fail(400, `${label} must be a valid email address.`);
    return s;
  },
  phone(val, label, { required = false } = {}) {
    if (isBlank(val)) { if (required) fail(400, `${label} is required.`); return null; }
    const s = String(val).trim();
    if (!/^\+?[0-9][0-9 ()\-]{5,19}$/.test(s)) fail(400, `${label} must be a valid phone number.`);
    return s;
  },
  password(val, label = 'Password') {
    const s = String(val || '');
    if (s.length < 8) fail(400, `${label} must be at least 8 characters.`);
    if (s.length > 200) fail(400, `${label} is too long.`);
    return s;
  },
  color(val, label = 'Colour') {
    if (isBlank(val)) return null;
    const s = String(val).trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(s)) fail(400, `${label} must look like #0B6E4F.`);
    return s;
  },
  ids(val, label) {
    if (val == null) return [];
    if (!Array.isArray(val)) fail(400, `${label} must be a list.`);
    const out = [...new Set(val.map((x) => Number(x)))];
    if (out.some((n) => !Number.isInteger(n) || n <= 0)) fail(400, `${label} contains an invalid item.`);
    if (out.length > 200) fail(400, `${label} has too many items.`);
    return out;
  },
};

// LIKE-safe search term
export function likeTerm(q) {
  return `%${String(q || '').trim().replace(/[\\%_]/g, (c) => '\\' + c)}%`;
}

export function chunk(arr, size = 80) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function paging(url, def = 25, max = 100) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(max, Math.max(1, parseInt(url.searchParams.get('limit') || String(def), 10) || def));
  return { page, limit, offset: (page - 1) * limit };
}

// ---------------------------------------------------------------------
// Secure image upload (student / teacher photos, school logo)
// ---------------------------------------------------------------------
const IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function sniffImage(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45) return 'image/webp';
  return null;
}

// Returns the new R2 key. Checks size, declared type AND the real file bytes.
export async function storeImage(env, file, keyPrefix) {
  if (!env.MATERIALS) fail(500, 'File storage is not configured.');
  if (!file || typeof file === 'string' || !file.size) fail(400, 'Please choose an image file.');
  if (file.size > MAX_IMAGE_BYTES) fail(400, 'The image is too large (3 MB maximum).');
  const buf = await file.arrayBuffer();
  const real = sniffImage(new Uint8Array(buf.slice(0, 16)));
  if (!real || !IMAGE_TYPES[real]) fail(400, 'Only PNG, JPG or WEBP images are allowed.');
  const key = `${keyPrefix}-${crypto.randomUUID()}.${IMAGE_TYPES[real]}`;
  await env.MATERIALS.put(key, buf, { httpMetadata: { contentType: real } });
  return key;
}

export async function imageResponse(env, key) {
  if (!key || !env.MATERIALS) return new Response('Not found', { status: 404 });
  const obj = await env.MATERIALS.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, {
    headers: {
      'Content-Type': (obj.httpMetadata && obj.httpMetadata.contentType) || 'image/jpeg',
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function randomToken(bytes = 12) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
}
