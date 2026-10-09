// Smart21Institution — accounts, tenant context, settings, logins & permissions,
// announcements and notifications.
import { hashPassword, verifyPassword, json } from '../../lib/auth.js';
import {
  fail, secure, readJson, V, audit, getInstContext, getSettings, saveSetting, notify,
  PERMISSIONS, ALL_PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS, ROLES, ROLE_LABELS, DEFAULT_GRADING,
  storeImage, imageResponse, randomToken, errorResponse, assertSameOrigin, slugify, likeTerm, paging, localToday, can,
} from '../../lib/institution-auth.js';

const TYPES = ['school', 'college', 'university', 'library', 'training_center', 'organization'];

function makeShort(name) {
  const words = String(name).replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const stop = new Set(['of', 'the', 'and', 'school', 'college', 'university', 'ltd', 'limited', 'centre', 'center', 'library']);
  let letters = words.filter((w) => !stop.has(w.toLowerCase())).map((w) => w[0].toUpperCase()).join('');
  if (letters.length < 2) letters = String(name).replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
  return (letters || 'INS').slice(0, 5);
}

async function uniqueSlug(env, name) {
  let base = slugify(name);
  if (['logo', 'public'].includes(base)) base += '-institution';   // reserved words used by the API paths
  for (let i = 0; i < 30; i++) {
    const s = i === 0 ? base : `${base}-${i + 1}`;
    const hit = await env.DB.prepare('SELECT 1 AS x FROM ins_institutions WHERE slug = ?').bind(s).first();
    if (!hit) return s;
  }
  return `${base}-${randomToken(3)}`;
}

const STARTER_CATEGORIES = ['General', 'Fiction', 'Science', 'Mathematics', 'History & Geography', 'Languages', 'Technology', 'Reference'];
const STARTER_RESOURCE_CATEGORIES = ['E-books', 'Notes & Handouts', 'Journals', 'Research', 'Institutional publications'];

export async function provisionInstitution(env, user, info) {
  const slug = await uniqueSlug(env, info.name);
  const ins = await env.DB.prepare(
    `INSERT INTO ins_institutions (name, short_name, slug, inst_type, phone, email, address, owner_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(info.name, makeShort(info.name), slug, info.inst_type || 'school', info.phone || null, info.email || null, info.address || null, user.id).run();
  const id = ins.meta.last_row_id;
  const year = new Date().getUTCFullYear();
  const stmts = [];
  STARTER_CATEGORIES.forEach((n) => stmts.push(env.DB.prepare('INSERT INTO ins_categories (institution_id, name) VALUES (?, ?)').bind(id, n)));
  STARTER_RESOURCE_CATEGORIES.forEach((n) => stmts.push(env.DB.prepare('INSERT INTO ins_resource_categories (institution_id, name) VALUES (?, ?)').bind(id, n)));
  stmts.push(env.DB.prepare('INSERT INTO ins_members (institution_id, user_id, role) VALUES (?, ?, ?)').bind(id, user.id, 'super_admin'));
  for (const role of ROLES.filter((r) => r !== 'super_admin')) {
    for (const p of DEFAULT_ROLE_PERMISSIONS[role]) {
      stmts.push(env.DB.prepare('INSERT INTO ins_role_permissions (institution_id, role, permission) VALUES (?, ?, ?)').bind(id, role, p));
    }
  }
  stmts.push(env.DB.prepare('INSERT INTO ins_academic_years (institution_id, name, start_date, end_date, is_current) VALUES (?, ?, ?, ?, 1)')
    .bind(id, `${year}/${year + 1}`, `${year}-01-01`, `${year}-12-31`));
  await env.DB.batch(stmts);
  const ay = await env.DB.prepare('SELECT id FROM ins_academic_years WHERE institution_id = ? LIMIT 1').bind(id).first();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO ins_terms (institution_id, academic_year_id, name, start_date, end_date, is_current) VALUES (?, ?, ?, ?, ?, 1)').bind(id, ay.id, 'Semester 1', `${year}-01-01`, `${year}-06-30`),
    env.DB.prepare('INSERT INTO ins_terms (institution_id, academic_year_id, name, start_date, end_date, is_current) VALUES (?, ?, ?, ?, ?, 0)').bind(id, ay.id, 'Semester 2', `${year}-07-01`, `${year}-12-31`),
  ]);
  return id;
}

export async function startSession(env, userId, remember) {
  const token = randomToken(32);
  const days = remember ? 30 : 1;
  const expires = new Date(Date.now() + days * 86400000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').bind(token, userId, expires).run();
  return `s21_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax` + (remember ? `; Expires=${new Date(expires).toUTCString()}` : '');
}

export const clientIp = (request) => request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || null;

async function tooManyAttempts(env, email, ip) {
  const a = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_login_attempts WHERE success = 0 AND email = ? AND created_at > datetime('now','-15 minutes')`).bind(email).first();
  if ((a?.n || 0) >= 8) return true;
  if (ip) {
    const b = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_login_attempts WHERE success = 0 AND ip = ? AND created_at > datetime('now','-15 minutes')`).bind(ip).first();
    if ((b?.n || 0) >= 25) return true;
  }
  return false;
}

// POST /api/institution/register — new account + new institution in one step.
export async function registerInstitution({ request, env }) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const instName = V.str(body.institution_name, 'Institution name', { required: true, max: 140, min: 2 });
    const type = V.oneOf(body.inst_type, 'Institution type', TYPES, { def: 'school' });
    const name = V.str(body.name, 'Your name', { required: true, max: 100 });
    const email = V.email(body.email, 'Email', { required: true });
    const password = V.password(body.password);
    const phone = V.phone(body.phone, 'Phone number');

    const ip = clientIp(request);
    const recent = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_login_attempts WHERE ip = ? AND email = '(signup)' AND created_at > datetime('now','-1 hour')`).bind(ip).first();
    if (ip && (recent?.n || 0) >= 10) fail(429, 'Too many sign-ups from this connection. Please try again later.');

    const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (exists) fail(409, 'An account with this email already exists. Please sign in instead, then create your institution.');

    const { hash, salt } = await hashPassword(password);
    const u = await env.DB.prepare('INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)').bind(name, email, hash, salt, 'user').run();
    const user = { id: u.meta.last_row_id, name, email };
    const id = await provisionInstitution(env, user, { name: instName, inst_type: type, phone, email });
    await env.DB.prepare(`INSERT INTO ins_login_attempts (email, ip, success) VALUES ('(signup)', ?, 1)`).bind(ip).run();
    const cookie = await startSession(env, user.id, true);
    await audit(env, request, { inst: { id }, user }, 'system', 'institution.create', 'institution', id, `Institution "${instName}" created`);
    return json({ ok: true, institution_id: id }, { status: 201, headers: { 'Set-Cookie': cookie } });
  } catch (e) { return errorResponse(e); }
}

// POST /api/institution/institutions — a signed-in person creates another institution.
export const createInstitution = secure({ inst: false }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.institution_name, 'Institution name', { required: true, max: 140, min: 2 });
  const type = V.oneOf(b.inst_type, 'Institution type', TYPES, { def: 'school' });
  const owned = await env.DB.prepare('SELECT COUNT(*) AS n FROM ins_institutions WHERE owner_user_id = ?').bind(ctx.user.id).first();
  if ((owned?.n || 0) >= 5) fail(400, 'You already own 5 institutions. Please contact support for more.');
  const id = await provisionInstitution(env, ctx.user, { name, inst_type: type, phone: V.phone(b.phone, 'Phone number'), email: ctx.user.email });
  await audit(env, request, { inst: { id }, user: ctx.user }, 'system', 'institution.create', 'institution', id, `Institution "${name}" created`);
  return json({ ok: true, institution_id: id }, { status: 201 });
});

// POST /api/institution/login
export async function login({ request, env }) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const email = V.str(body.email, 'Email', { required: true, max: 160 }).toLowerCase();
    const password = String(body.password || '');
    if (!password) fail(400, 'Password is required.');
    const ip = clientIp(request);
    if (await tooManyAttempts(env, email, ip)) fail(429, 'Too many failed sign-in attempts. Please wait 15 minutes and try again, or use "Forgot password".');

    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    const ok = user ? await verifyPassword(password, user.password_hash, user.password_salt) : false;
    await env.DB.prepare('INSERT INTO ins_login_attempts (email, ip, success) VALUES (?, ?, ?)').bind(email, ip, ok ? 1 : 0).run();
    if (!ok) {
      if (user) {
        const { results: ms } = await env.DB.prepare('SELECT institution_id FROM ins_members WHERE user_id = ?').bind(user.id).all();
        for (const m of ms) await audit(env, request, { inst: { id: m.institution_id }, user }, 'auth', 'user.login', 'user', user.id, 'Wrong password', 'failed');
      }
      fail(401, 'Incorrect email or password.');
    }
    const cookie = await startSession(env, user.id, !!body.remember);
    await env.DB.prepare('INSERT INTO login_events (user_id, ip_address, user_agent) VALUES (?, ?, ?)').bind(user.id, ip, request.headers.get('User-Agent') || null).run();
    const { results: ms } = await env.DB.prepare('SELECT institution_id, role FROM ins_members WHERE user_id = ? AND active = 1 ORDER BY id').bind(user.id).all();
    for (const m of ms) await audit(env, request, { inst: { id: m.institution_id }, user }, 'auth', 'user.login', 'user', user.id, `Signed in as ${m.role}`);
    return json({ ok: true, has_institution: ms.length > 0, role: ms[0] ? ms[0].role : null }, { headers: { 'Set-Cookie': cookie } });
  } catch (e) { return errorResponse(e); }
}

export async function logout({ request, env }) {
  try {
    const ctx = await getInstContext(request, env);
    if (ctx && ctx.inst) await audit(env, request, ctx, 'auth', 'user.logout', 'user', ctx.user.id, 'Signed out');
  } catch (e) { /* ignore */ }
  const header = request.headers.get('Cookie') || '';
  const match = header.match(/(?:^|;\s*)s21_session=([^;]+)/);
  if (match) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(match[1]).run();
  return json({ ok: true }, { headers: { 'Set-Cookie': 's21_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0' } });
}

// GET /api/institution/context — who am I, which institution, what may I do.
export async function context({ request, env }) {
  try {
    const ctx = await getInstContext(request, env);
    if (ctx.error) return ctx.error;
    const { results: memberships } = await env.DB.prepare(
      `SELECT i.id, i.name, m.role FROM ins_members m JOIN ins_institutions i ON i.id = m.institution_id
       WHERE m.user_id = ? AND m.active = 1 ORDER BY m.id`).bind(ctx.user.id).all();
    const user = { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email };
    if (!ctx.inst) return json({ user, institution: null, memberships });
    const settings = await getSettings(env, ctx.inst.id);
    return json({
      user, institution: { ...ctx.inst, logo_key: undefined, has_logo: !!ctx.inst.logo_key }, role: ctx.role, role_label: ROLE_LABELS[ctx.role],
      permissions: [...ctx.perms], memberships, student_id: ctx.studentId, staff_id: ctx.staffId,
      settings: { loan_days_student: settings.loan_days_student, max_renewals: settings.max_renewals, max_upload_mb: settings.max_upload_mb },
    });
  } catch (e) { return errorResponse(e); }
}

// GET /api/institution/lookups — everything the forms need in one call.
export const lookups = secure(async ({ env, ctx }) => {
  const id = ctx.inst.id;
  const q = (sql) => env.DB.prepare(sql).bind(id).all().then((r) => r.results);
  const [departments, programmes, categories, resourceCategories, years, terms] = await Promise.all([
    q('SELECT id, name, code FROM ins_departments WHERE institution_id = ? AND active = 1 ORDER BY name'),
    q('SELECT id, name, code, department_id, level FROM ins_programmes WHERE institution_id = ? AND active = 1 ORDER BY name'),
    q('SELECT id, name FROM ins_categories WHERE institution_id = ? ORDER BY name'),
    q('SELECT id, name FROM ins_resource_categories WHERE institution_id = ? ORDER BY name'),
    q('SELECT id, name, is_current FROM ins_academic_years WHERE institution_id = ? ORDER BY name DESC'),
    q('SELECT id, name, academic_year_id, is_current FROM ins_terms WHERE institution_id = ? ORDER BY id DESC'),
  ]);
  return json({ departments, programmes, categories, resource_categories: resourceCategories, academic_years: years, terms });
});

// ---------------------------------------------------------------------
// Institution info, logo & settings
// ---------------------------------------------------------------------
export const getInstInfo = secure({ perm: 'settings.manage' }, async ({ env, ctx }) => {
  const settings = await getSettings(env, ctx.inst.id);
  return json({ institution: ctx.inst, settings, types: TYPES });
});

export const updateInstInfo = secure({ perm: 'settings.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, 'Institution name', { required: true, max: 140, min: 2 });
  const short = V.str(b.short_name, 'Short name', { required: true, max: 8 }).toUpperCase();
  const off = V.int(b.utc_offset_min, 'Time zone', { min: -720, max: 840 });
  await env.DB.prepare(
    `UPDATE ins_institutions SET name = ?, short_name = ?, inst_type = ?, about = ?, phone = ?, email = ?, address = ?, website = ?,
       currency = ?, primary_color = COALESCE(?, primary_color), utc_offset_min = COALESCE(?, utc_offset_min), is_public = ? WHERE id = ?`
  ).bind(name, short, V.oneOf(b.inst_type, 'Institution type', TYPES, { def: ctx.inst.inst_type }), V.str(b.about, 'About', { max: 800 }),
    V.phone(b.phone, 'Phone'), V.email(b.email, 'Email'), V.str(b.address, 'Address', { max: 300 }), V.str(b.website, 'Website', { max: 200 }),
    V.str(b.currency, 'Currency', { max: 6, required: true }).toUpperCase(), V.color(b.primary_color, 'Brand colour'), off, b.is_public ? 1 : 0, ctx.inst.id).run();
  await audit(env, request, ctx, 'settings', 'settings.institution', 'institution', ctx.inst.id, 'Institution information updated');
  return json({ ok: true });
});

export const uploadLogo = secure({ perm: 'settings.manage' }, async ({ request, env, ctx }) => {
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, 'Please choose a logo image.');
  const key = await storeImage(env, form.get('logo'), `institution/${ctx.inst.id}/logo`);
  const old = ctx.inst.logo_key;
  await env.DB.prepare('UPDATE ins_institutions SET logo_key = ? WHERE id = ?').bind(key, ctx.inst.id).run();
  if (old && env.MATERIALS) await env.MATERIALS.delete(old).catch(() => {});
  await audit(env, request, ctx, 'settings', 'settings.logo', 'institution', ctx.inst.id, 'Logo changed');
  return json({ ok: true });
});

// Logos are public branding (sign-in page, public catalogue, printed reports).
export async function publicLogo({ params, env }) {
  const s = await env.DB.prepare('SELECT logo_key FROM ins_institutions WHERE id = ?').bind(params.id).first();
  if (!s || !s.logo_key) return new Response('Not found', { status: 404 });
  return imageResponse(env, s.logo_key);
}

const NUM_SETTINGS = {
  loan_days_student: [1, 365], loan_days_staff: [1, 365], max_loans_student: [1, 100], max_loans_staff: [1, 100],
  max_renewals: [0, 20], renewal_days: [1, 120], fine_per_day: [0, 1e9], lost_fine_multiplier: [0, 20], damaged_fine: [0, 1e9],
  reservation_hold_days: [1, 30], max_upload_mb: [1, 25],
  notify_email: [0, 1], notify_sms: [0, 1], notify_push: [0, 1],
};
export const saveSettings = secure({ perm: 'settings.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const id = ctx.inst.id;
  for (const [k, [lo, hi]] of Object.entries(NUM_SETTINGS)) {
    if (b[k] !== undefined) await saveSetting(env, id, k, V.num(b[k], k, { min: lo, max: hi, required: true }));
  }
  for (const k of ['student_prefix', 'staff_prefix', 'accession_prefix']) {
    if (b[k] !== undefined) {
      const val = String(b[k] || '').trim();
      if (!/^[A-Za-z0-9]{1,8}$/.test(val)) fail(400, 'Prefixes must be 1–8 letters or numbers.');
      await saveSetting(env, id, k, val.toUpperCase());
    }
  }
  if (b.grading_scale !== undefined) {
    if (!Array.isArray(b.grading_scale) || b.grading_scale.length < 2 || b.grading_scale.length > 12) fail(400, 'Add between 2 and 12 grades.');
    const scale = b.grading_scale.map((g) => ({ min: V.num(g.min, 'Minimum marks', { required: true, min: 0, max: 100 }), grade: V.str(g.grade, 'Grade', { required: true, max: 4 }), points: V.num(g.points, 'Points', { min: 0, max: 100 }) ?? 0 }));
    if (!scale.some((g) => g.min === 0)) fail(400, 'One grade must start at 0 marks so every mark has a grade.');
    await saveSetting(env, id, 'grading_scale', scale);
  }
  await audit(env, request, ctx, 'settings', 'settings.update', 'settings', null, Object.keys(b).join(', '));
  return json({ ok: true, settings: await getSettings(env, id) });
});

// ---------------------------------------------------------------------
// Roles & permissions (configurable, never hard-coded)
// ---------------------------------------------------------------------
export const getPermissions = secure({ perm: ['permissions.manage', 'users.manage', 'settings.manage'] }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare('SELECT role, permission FROM ins_role_permissions WHERE institution_id = ?').bind(ctx.inst.id).all();
  const matrix = { super_admin: ALL_PERMISSION_KEYS };
  ROLES.filter((r) => r !== 'super_admin').forEach((r) => { matrix[r] = []; });
  results.forEach((r) => { if (matrix[r.role]) matrix[r.role].push(r.permission); });
  return json({ catalogue: PERMISSIONS, matrix, defaults: DEFAULT_ROLE_PERMISSIONS, roles: ROLES, labels: ROLE_LABELS });
});

export const savePermissions = secure({ perm: 'permissions.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const role = V.oneOf(b.role, 'Role', ROLES.filter((r) => r !== 'super_admin'), { required: true });
  const perms = [...new Set((b.permissions || []).map(String))];
  if (perms.some((p) => !ALL_PERMISSION_KEYS.includes(p))) fail(400, 'Unknown permission in the list.');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM ins_role_permissions WHERE institution_id = ? AND role = ?').bind(ctx.inst.id, role),
    ...perms.map((p) => env.DB.prepare('INSERT INTO ins_role_permissions (institution_id, role, permission) VALUES (?, ?, ?)').bind(ctx.inst.id, role, p)),
  ]);
  await audit(env, request, ctx, 'settings', 'permissions.change', 'role', null, `${role}: ${perms.length} permissions`);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Logins (people who can sign in to this institution)
// ---------------------------------------------------------------------
export const listUsers = secure({ perm: 'users.manage' }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    `SELECT m.id, m.role, m.active, m.student_id, m.staff_id, m.created_at, u.id AS user_id, u.name, u.email,
            (SELECT MAX(logged_in_at) FROM login_events le WHERE le.user_id = u.id) AS last_login
     FROM ins_members m JOIN users u ON u.id = m.user_id WHERE m.institution_id = ?
     ORDER BY CASE m.role WHEN 'super_admin' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.name`).bind(ctx.inst.id).all();
  return json({ users: results, roles: ROLES, labels: ROLE_LABELS });
});

export const addUser = secure({ perm: 'users.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, 'Full name', { required: true, max: 100 });
  const email = V.email(b.email, 'Email', { required: true });
  const role = V.oneOf(b.role, 'Role', ROLES, { required: true });
  if (role === 'super_admin' && ctx.role !== 'super_admin') fail(403, 'Only a Super Administrator can create another Super Administrator.');
  const studentId = V.int(b.student_id, 'Student', { min: 1 });
  const staffId = V.int(b.staff_id, 'Staff record', { min: 1 });
  if (role === 'student') {
    if (!studentId) fail(400, 'Choose which student record this login belongs to.');
    const s = await env.DB.prepare('SELECT id FROM ins_students WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(studentId, ctx.inst.id).first();
    if (!s) fail(404, 'The student record could not be found.');
  }
  if (staffId) {
    const s = await env.DB.prepare('SELECT id FROM ins_staff WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(staffId, ctx.inst.id).first();
    if (!s) fail(404, 'The staff record could not be found.');
  }
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  let userId; let linked = false;
  if (existing) {
    userId = existing.id; linked = true;
    const m = await env.DB.prepare('SELECT id FROM ins_members WHERE institution_id = ? AND user_id = ?').bind(ctx.inst.id, userId).first();
    if (m) fail(409, 'This person already has a login here.');
  } else {
    const { hash, salt } = await hashPassword(V.password(b.password, 'Temporary password'));
    const r = await env.DB.prepare('INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)').bind(name, email, hash, salt, 'user').run();
    userId = r.meta.last_row_id;
  }
  await env.DB.prepare('INSERT INTO ins_members (institution_id, user_id, role, student_id, staff_id) VALUES (?, ?, ?, ?, ?)')
    .bind(ctx.inst.id, userId, role, role === 'student' ? studentId : null, role === 'student' ? null : staffId).run();
  await audit(env, request, ctx, 'users', 'user.create', 'user', userId, `${email} as ${role}`);
  return json({ ok: true, user_id: userId, linked }, { status: 201 });
});

export const updateUser = secure({ perm: 'users.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const m = await env.DB.prepare('SELECT * FROM ins_members WHERE id = ? AND institution_id = ?').bind(params.id, ctx.inst.id).first();
  if (!m) fail(404, 'User not found.');
  const role = b.role !== undefined ? V.oneOf(b.role, 'Role', ROLES, { required: true }) : m.role;
  const active = b.active === undefined ? m.active : (b.active ? 1 : 0);
  if ((role === 'super_admin' || m.role === 'super_admin') && ctx.role !== 'super_admin') fail(403, 'Only a Super Administrator can change a Super Administrator.');
  if (m.role === 'super_admin' && (role !== 'super_admin' || !active)) {
    const others = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_members WHERE institution_id = ? AND role = 'super_admin' AND active = 1 AND id != ?`).bind(ctx.inst.id, m.id).first();
    if (!others.n) fail(400, 'Your institution needs at least one active Super Administrator.');
  }
  if (m.user_id === ctx.user.id && !active) fail(400, 'You cannot switch off your own login.');
  await env.DB.prepare('UPDATE ins_members SET role = ?, active = ? WHERE id = ?').bind(role, active, m.id).run();
  if (b.new_password) {
    const other = await env.DB.prepare('SELECT COUNT(*) AS n FROM ins_members WHERE user_id = ? AND institution_id != ?').bind(m.user_id, ctx.inst.id).first();
    if (other.n) fail(400, 'This person also belongs to another institution, so only they can change their password.');
    const { hash, salt } = await hashPassword(V.password(b.new_password, 'New password'));
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').bind(hash, salt, m.user_id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(m.user_id),
    ]);
  }
  await audit(env, request, ctx, 'users', m.role !== role ? 'permissions.role_change' : 'user.update', 'user', m.user_id, `${m.role}→${role}, active=${active}${b.new_password ? ', password reset' : ''}`);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------
const AUDIENCES = ['public', 'members', 'staff', 'students', 'teachers'];

function audienceVisible(role) {
  // which announcement audiences a signed-in role may read
  if (['super_admin', 'admin'].includes(role)) return AUDIENCES;
  if (role === 'student') return ['public', 'members', 'students'];
  if (role === 'teacher') return ['public', 'members', 'staff', 'teachers'];
  return ['public', 'members', 'staff'];
}

export const listAnnouncements = secure(async ({ env, url, ctx }) => {
  const today = localToday(ctx.off);
  const manage = can(ctx, 'announcements.manage');
  const vis = manage ? AUDIENCES : audienceVisible(ctx.role);
  const { page, limit, offset } = paging(url, 20, 50);
  const where = `institution_id = ? AND deleted_at IS NULL AND audience IN (${vis.map(() => '?').join(',')})${manage ? '' : ' AND (expires_on IS NULL OR expires_on >= ?)'}`;
  const binds = [ctx.inst.id, ...vis, ...(manage ? [] : [today])];
  const [{ results }, total] = await Promise.all([
    env.DB.prepare(`SELECT a.*, u.name AS author FROM ins_announcements a LEFT JOIN users u ON u.id = a.author_id WHERE ${where.replace(/institution_id/g, 'a.institution_id').replace(/deleted_at/g, 'a.deleted_at').replace(/audience/g, 'a.audience').replace(/expires_on/g, 'a.expires_on')} ORDER BY a.pinned DESC, a.id DESC LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_announcements WHERE ${where}`).bind(...binds).first(),
  ]);
  return json({ announcements: results, total: total.n, page, limit, today });
});

export const createAnnouncement = secure({ perm: 'announcements.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const title = V.str(b.title, 'Title', { required: true, max: 160, min: 3 });
  const body = V.str(b.body, 'Message', { required: true, max: 4000, min: 3 });
  const audience = V.oneOf(b.audience, 'Audience', AUDIENCES, { def: 'members' });
  const r = await env.DB.prepare('INSERT INTO ins_announcements (institution_id, title, body, audience, pinned, expires_on, author_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(ctx.inst.id, title, body, audience, b.pinned ? 1 : 0, V.date(b.expires_on, 'Expiry date'), ctx.user.id).run();
  const id = r.meta.last_row_id;
  // In-app notification for everybody who can read it (other channels plug into notify()).
  if (audience !== 'public') {
    const roles = { members: ROLES, staff: ['super_admin', 'admin', 'librarian', 'staff', 'teacher'], students: ['student', 'super_admin', 'admin'], teachers: ['teacher', 'super_admin', 'admin'] }[audience];
    const { results } = await env.DB.prepare(`SELECT user_id FROM ins_members WHERE institution_id = ? AND active = 1 AND role IN (${roles.map(() => '?').join(',')}) LIMIT 500`).bind(ctx.inst.id, ...roles).all();
    for (const m of results) if (m.user_id !== ctx.user.id) await notify(env, ctx.inst.id, m.user_id, 'announcement', title, body.slice(0, 200), '#announcements');
  }
  await audit(env, request, ctx, 'announcements', 'announcement.create', 'announcement', id, title);
  return json({ ok: true, id }, { status: 201 });
});

export const deleteAnnouncement = secure({ perm: 'announcements.manage' }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare(`UPDATE ins_announcements SET deleted_at = datetime('now') WHERE id = ? AND institution_id = ? AND deleted_at IS NULL`).bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, 'The announcement could not be found.');
  await audit(env, request, ctx, 'announcements', 'announcement.delete', 'announcement', Number(params.id), null);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Notifications (per person)
// ---------------------------------------------------------------------
export const listNotifications = secure(async ({ env, ctx }) => {
  const { results } = await env.DB.prepare('SELECT id, kind, title, message, link, read_at, created_at FROM ins_notifications WHERE institution_id = ? AND user_id = ? ORDER BY id DESC LIMIT 40').bind(ctx.inst.id, ctx.user.id).all();
  const unread = await env.DB.prepare('SELECT COUNT(*) AS n FROM ins_notifications WHERE institution_id = ? AND user_id = ? AND read_at IS NULL').bind(ctx.inst.id, ctx.user.id).first();
  return json({ notifications: results, unread: unread.n });
});

export const readNotifications = secure(async ({ request, env, ctx }) => {
  const b = await request.json().catch(() => ({}));
  if (b && b.id) await env.DB.prepare(`UPDATE ins_notifications SET read_at = datetime('now') WHERE id = ? AND user_id = ? AND institution_id = ?`).bind(Number(b.id), ctx.user.id, ctx.inst.id).run();
  else await env.DB.prepare(`UPDATE ins_notifications SET read_at = datetime('now') WHERE user_id = ? AND institution_id = ? AND read_at IS NULL`).bind(ctx.user.id, ctx.inst.id).run();
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Public pages (no sign-in): institution card + announcements
// ---------------------------------------------------------------------
export async function publicInfo({ params, env }) {
  const i = await env.DB.prepare('SELECT id, name, short_name, slug, inst_type, about, phone, email, address, website, primary_color, is_public, logo_key FROM ins_institutions WHERE slug = ?').bind(params.slug).first();
  if (!i) return json({ error: 'This institution could not be found.' }, { status: 404 });
  if (!i.is_public) return json({ error: 'This institution has not made its catalogue public.', private: true, name: i.name }, { status: 403 });
  const today = localToday(180);
  const { results } = await env.DB.prepare(
    `SELECT id, title, body, created_at FROM ins_announcements WHERE institution_id = ? AND audience = 'public' AND deleted_at IS NULL AND (expires_on IS NULL OR expires_on >= ?) ORDER BY pinned DESC, id DESC LIMIT 10`
  ).bind(i.id, today).all();
  const counts = await env.DB.prepare(`SELECT (SELECT COUNT(*) FROM ins_books WHERE institution_id = ?1 AND deleted_at IS NULL AND archived = 0) AS books,
     (SELECT COUNT(*) FROM ins_resources WHERE institution_id = ?1 AND deleted_at IS NULL AND access_level = 'public') AS resources`).bind(i.id).first();
  const { logo_key, ...rest } = i;
  return json({ institution: { ...rest, has_logo: !!logo_key }, announcements: results, counts });
}
