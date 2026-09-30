// School System — accounts, tenant context, settings, users & permissions.
import { hashPassword, verifyPassword, json, getSessionUser } from '../../lib/auth.js';
import {
  fail, secure, readJson, V, audit, getSchoolContext, getSettings, saveSetting, safeJson, currentYear,
  PERMISSIONS, ALL_PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS, DEFAULT_PAYMENT_METHODS, ROLES,
  storeImage, imageResponse, randomToken, errorResponse, assertSameOrigin, can,
} from '../../lib/school-auth.js';
import { CLASS_ORDER } from '../../lib/school-queries.js';

// ---------------------------------------------------------------------
// Creating a school (with sensible starter data every school can edit)
// ---------------------------------------------------------------------
function makeShort(name) {
  const words = String(name).replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const stop = new Set(['of', 'the', 'and', 'school', 'schools', 'academy', 'college', 'centre', 'center']);
  let letters = words.filter((w) => !stop.has(w.toLowerCase())).map((w) => w[0].toUpperCase()).join('');
  if (letters.length < 2) letters = String(name).replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
  return (letters || 'SCH').slice(0, 5);
}

const STARTER_CLASSES = [
  ['Form One', 'O-Level'], ['Form Two', 'O-Level'], ['Form Three', 'O-Level'],
  ['Form Four', 'O-Level'], ['Form Five', 'A-Level'], ['Form Six', 'A-Level'],
];
const STARTER_SUBJECTS = [
  ['Mathematics', 'MATH'], ['Physics', 'PHY'], ['Chemistry', 'CHEM'], ['Biology', 'BIO'],
  ['English', 'ENG'], ['Kiswahili', 'KISW'], ['Geography', 'GEO'], ['History', 'HIST'], ['Computer Science', 'CS'],
];

export async function provisionSchool(env, user, info) {
  const name = info.name;
  const short = makeShort(name);
  const ins = await env.DB.prepare(
    `INSERT INTO sch_schools (name, short_name, admission_prefix, phone, email, address, owner_user_id, receipt_note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(name, short, short, info.phone || null, info.email || null, info.address || null, user.id,
    'Thank you for your payment.').run();
  const schoolId = ins.meta.last_row_id;

  const year = new Date().getUTCFullYear();
  const y = await env.DB.prepare(
    `INSERT INTO sch_academic_years (school_id, name, start_date, end_date, is_current) VALUES (?, ?, ?, ?, 1)`
  ).bind(schoolId, String(year), `${year}-01-01`, `${year}-12-31`).run();
  const yearId = y.meta.last_row_id;

  const stmts = [];
  ['Term 1', 'Term 2'].forEach((t, i) => stmts.push(
    env.DB.prepare('INSERT INTO sch_terms (school_id, name, sort_order) VALUES (?, ?, ?)').bind(schoolId, t, i + 1)));
  STARTER_CLASSES.forEach(([n, level]) => stmts.push(
    env.DB.prepare(`INSERT INTO sch_classes (school_id, name, level, stream, academic_year_id, max_students) VALUES (?, ?, ?, '', ?, 40)`)
      .bind(schoolId, n, level, yearId)));
  STARTER_SUBJECTS.forEach(([n, code]) => stmts.push(
    env.DB.prepare('INSERT INTO sch_subjects (school_id, name, code) VALUES (?, ?, ?)').bind(schoolId, n, code)));
  stmts.push(env.DB.prepare('INSERT INTO sch_members (school_id, user_id, role) VALUES (?, ?, ?)').bind(schoolId, user.id, 'admin'));
  for (const role of ['teacher', 'receptionist']) {
    for (const p of DEFAULT_ROLE_PERMISSIONS[role]) {
      stmts.push(env.DB.prepare('INSERT INTO sch_role_permissions (school_id, role, permission) VALUES (?, ?, ?)').bind(schoolId, role, p));
    }
  }
  await env.DB.batch(stmts);

  // Every starter class studies every starter subject (editable in Classes).
  const { results: classes } = await env.DB.prepare('SELECT id FROM sch_classes WHERE school_id = ?').bind(schoolId).all();
  const { results: subjects } = await env.DB.prepare('SELECT id FROM sch_subjects WHERE school_id = ?').bind(schoolId).all();
  const links = [];
  for (const c of classes) for (const s of subjects) {
    links.push(env.DB.prepare('INSERT INTO sch_class_subjects (school_id, class_id, subject_id) VALUES (?, ?, ?)').bind(schoolId, c.id, s.id));
  }
  await env.DB.batch(links);

  // Starter fee structure — amounts are examples; the school edits them.
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO sch_fee_structures (school_id, academic_year_id, class_id, fee_type, name, amount) VALUES (?, ?, NULL, 'registration', 'Registration fee', 20000)`).bind(schoolId, yearId),
    env.DB.prepare(`INSERT INTO sch_fee_structures (school_id, academic_year_id, class_id, fee_type, name, amount) VALUES (?, ?, NULL, 'tuition', 'Tuition fee', 300000)`).bind(schoolId, yearId),
    env.DB.prepare(`INSERT INTO sch_fee_structures (school_id, academic_year_id, class_id, fee_type, name, amount) VALUES (?, ?, NULL, 'examination', 'Examination fee', 30000)`).bind(schoolId, yearId),
  ]);
  return schoolId;
}

async function startSession(env, userId, remember) {
  const token = randomToken(32);
  const days = remember ? 30 : 1;
  const expires = new Date(Date.now() + days * 86400000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').bind(token, userId, expires).run();
  const cookie = `s21_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax` + (remember ? `; Expires=${new Date(expires).toUTCString()}` : '');
  return cookie;
}

const clientIp = (request) => request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || null;

async function tooManyAttempts(env, email, ip) {
  const a = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM sch_login_attempts WHERE success = 0 AND email = ? AND created_at > datetime('now','-15 minutes')`
  ).bind(email).first();
  if ((a?.n || 0) >= 8) return true;
  if (ip) {
    const b = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM sch_login_attempts WHERE success = 0 AND ip = ? AND created_at > datetime('now','-15 minutes')`
    ).bind(ip).first();
    if ((b?.n || 0) >= 25) return true;
  }
  return false;
}

// POST /api/school/register-school  — new account + new school in one step.
export async function registerSchool({ request, env }) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const schoolName = V.str(body.school_name, 'School name', { required: true, max: 120, min: 2 });
    const name = V.str(body.name, 'Your name', { required: true, max: 100 });
    const email = V.email(body.email, 'Email', { required: true });
    const password = V.password(body.password);
    const phone = V.phone(body.phone, 'Phone number');

    const ip = clientIp(request);
    const recent = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM sch_login_attempts WHERE ip = ? AND email = '(signup)' AND created_at > datetime('now','-1 hour')`
    ).bind(ip).first();
    if (ip && (recent?.n || 0) >= 10) fail(429, 'Too many sign-ups from this connection. Please try again later.');

    const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (exists) fail(409, 'An account with this email already exists. Please sign in instead, then create your school.');

    const { hash, salt } = await hashPassword(password);
    const u = await env.DB.prepare(
      'INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)'
    ).bind(name, email, hash, salt, 'user').run();
    const user = { id: u.meta.last_row_id, name, email };
    const schoolId = await provisionSchool(env, user, { name: schoolName, phone, email });
    await env.DB.prepare(`INSERT INTO sch_login_attempts (email, ip, success) VALUES ('(signup)', ?, 1)`).bind(ip).run();

    const cookie = await startSession(env, user.id, true);
    const ctx = { school: { id: schoolId }, user };
    await audit(env, request, ctx, 'school.create', 'school', schoolId, `School "${schoolName}" created`);
    return json({ ok: true, school_id: schoolId }, { status: 201, headers: { 'Set-Cookie': cookie } });
  } catch (e) { return errorResponse(e); }
}

// POST /api/school/schools — a signed-in person creates another school.
export const createSchool = secure({ school: false }, async ({ request, env, ctx }) => {
  const body = await readJson(request);
  const schoolName = V.str(body.school_name, 'School name', { required: true, max: 120, min: 2 });
  const phone = V.phone(body.phone, 'Phone number');
  const owned = await env.DB.prepare('SELECT COUNT(*) AS n FROM sch_schools WHERE owner_user_id = ?').bind(ctx.user.id).first();
  if ((owned?.n || 0) >= 5) fail(400, 'You already own 5 schools. Please contact support for more.');
  const schoolId = await provisionSchool(env, ctx.user, { name: schoolName, phone, email: ctx.user.email });
  await audit(env, request, { school: { id: schoolId }, user: ctx.user }, 'school.create', 'school', schoolId, `School "${schoolName}" created`);
  return json({ ok: true, school_id: schoolId }, { status: 201 });
});

// POST /api/school/login
export async function login({ request, env }) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const email = V.str(body.email, 'Email', { required: true, max: 160 }).toLowerCase();
    const password = String(body.password || '');
    if (!password) fail(400, 'Password is required.');
    const ip = clientIp(request);

    if (await tooManyAttempts(env, email, ip)) {
      fail(429, 'Too many failed sign-in attempts. Please wait 15 minutes and try again, or use "Forgot password".');
    }
    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    const ok = user ? await verifyPassword(password, user.password_hash, user.password_salt) : false;
    await env.DB.prepare('INSERT INTO sch_login_attempts (email, ip, success) VALUES (?, ?, ?)').bind(email, ip, ok ? 1 : 0).run();
    if (!ok) fail(401, 'Incorrect email or password.');

    const cookie = await startSession(env, user.id, !!body.remember);
    await env.DB.prepare('INSERT INTO login_events (user_id, ip_address, user_agent) VALUES (?, ?, ?)')
      .bind(user.id, ip, request.headers.get('User-Agent') || null).run();

    const { results: ms } = await env.DB.prepare(
      'SELECT school_id, role FROM sch_members WHERE user_id = ? AND active = 1 ORDER BY id'
    ).bind(user.id).all();
    for (const m of ms) {
      await audit(env, request, { school: { id: m.school_id }, user }, 'user.login', 'user', user.id, `Signed in as ${m.role}`);
    }
    return json({ ok: true, has_school: ms.length > 0, role: ms[0] ? ms[0].role : null }, { headers: { 'Set-Cookie': cookie } });
  } catch (e) { return errorResponse(e); }
}

export async function logout({ request, env }) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(/(?:^|;\s*)s21_session=([^;]+)/);
  if (match) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(match[1]).run();
  return json({ ok: true }, { headers: { 'Set-Cookie': 's21_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0' } });
}

// GET /api/school/context — who am I, which school, what may I do.
export async function context({ request, env }) {
  try {
    const ctx = await getSchoolContext(request, env);
    if (ctx.error) return ctx.error;
    const { results: memberships } = await env.DB.prepare(
      `SELECT s.id, s.name, m.role FROM sch_members m JOIN sch_schools s ON s.id = m.school_id
       WHERE m.user_id = ? AND m.active = 1 ORDER BY m.id`
    ).bind(ctx.user.id).all();
    const user = { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email };
    if (!ctx.school) return json({ user, school: null, memberships });

    const [settings, year] = await Promise.all([getSettings(env, ctx.school.id), currentYear(env, ctx.school.id).catch(() => null)]);
    return json({
      user, school: { ...ctx.school, logo_key: undefined, has_logo: !!ctx.school.logo_key }, role: ctx.role, permissions: [...ctx.perms],
      teacher_id: ctx.teacherId, parent_id: ctx.parentId, memberships,
      settings: { payment_methods: settings.payment_methods, division_enabled: !!settings.division.enabled },
      current_year: year ? { id: year.id, name: year.name } : null,
    });
  } catch (e) { return errorResponse(e); }
}

// GET /api/school/lookups — everything the forms need in one call.
export const lookups = secure({ parent: true }, async ({ env, ctx }) => {
  const sid = ctx.school.id;
  const q = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then((r) => r.results);
  const [years, terms, classes, subjects, teachers, settings] = await Promise.all([
    q('SELECT * FROM sch_academic_years WHERE school_id = ? ORDER BY name DESC', sid),
    q('SELECT * FROM sch_terms WHERE school_id = ? ORDER BY sort_order, id', sid),
    q(`SELECT c.id, c.name, c.stream, c.level, c.academic_year_id, c.max_students, c.status, c.teacher_id
       FROM sch_classes c WHERE c.school_id = ? ORDER BY ${CLASS_ORDER}, c.name, c.stream`, sid),
    q('SELECT id, name, code, status FROM sch_subjects WHERE school_id = ? ORDER BY name', sid),
    ctx.role === 'parent' ? Promise.resolve([]) : q('SELECT id, full_name, employment_status FROM sch_teachers WHERE school_id = ? ORDER BY full_name', sid),
    getSettings(env, sid),
  ]);
  return json({ years, terms, classes, subjects, teachers, payment_methods: settings.payment_methods, grading_scale: settings.grading_scale });
});

// ---------------------------------------------------------------------
// School info & logo
// ---------------------------------------------------------------------
export const getSchoolInfo = secure({ perm: 'settings.manage' }, async ({ env, ctx }) => {
  const settings = await getSettings(env, ctx.school.id);
  return json({ school: ctx.school, settings });
});

export const updateSchoolInfo = secure({ perm: 'settings.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, 'School name', { required: true, max: 120, min: 2 });
  const shortName = V.str(b.short_name, 'Short name', { required: true, max: 8 }).toUpperCase();
  const prefix = V.str(b.admission_prefix, 'Admission number prefix', { required: true, max: 8 }).toUpperCase();
  if (!/^[A-Z0-9]+$/.test(prefix)) fail(400, 'Admission prefix can only contain letters and numbers.');
  const social = {};
  for (const k of ['facebook', 'instagram', 'x', 'youtube', 'tiktok']) {
    const v = V.str(b.social && b.social[k], k, { max: 200 });
    if (v) social[k] = v;
  }
  await env.DB.prepare(
    `UPDATE sch_schools SET name = ?, short_name = ?, admission_prefix = ?, phone = ?, email = ?, address = ?, website = ?,
       social = ?, currency = ?, primary_color = COALESCE(?, primary_color), receipt_note = ? WHERE id = ?`
  ).bind(name, shortName, prefix, V.phone(b.phone, 'Phone'), V.email(b.email, 'Email'), V.str(b.address, 'Address', { max: 300 }),
    V.str(b.website, 'Website', { max: 200 }), JSON.stringify(social), V.str(b.currency, 'Currency', { max: 6, required: true }).toUpperCase(),
    V.color(b.primary_color, 'Brand colour'), V.str(b.receipt_note, 'Receipt note', { max: 300 }), ctx.school.id).run();
  await audit(env, request, ctx, 'settings.school', 'school', ctx.school.id, 'School information updated');
  return json({ ok: true });
});

export const uploadLogo = secure({ perm: 'settings.manage' }, async ({ request, env, ctx }) => {
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, 'Please choose a logo image.');
  const key = await storeImage(env, form.get('logo'), `school/${ctx.school.id}/logo`);
  const old = ctx.school.logo_key;
  await env.DB.prepare('UPDATE sch_schools SET logo_key = ? WHERE id = ?').bind(key, ctx.school.id).run();
  if (old && env.MATERIALS) await env.MATERIALS.delete(old).catch(() => {});
  await audit(env, request, ctx, 'settings.logo', 'school', ctx.school.id, 'Logo changed');
  return json({ ok: true });
});

// Logos are public branding (shown on the sign-in page & verification page).
export async function publicLogo({ params, env }) {
  const s = await env.DB.prepare('SELECT logo_key FROM sch_schools WHERE id = ?').bind(params.id).first();
  if (!s || !s.logo_key) return new Response('Not found', { status: 404 });
  return imageResponse(env, s.logo_key);
}

export const saveSettings = secure({ perm: 'settings.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const sid = ctx.school.id;
  if (b.payment_methods !== undefined) {
    if (!Array.isArray(b.payment_methods) || !b.payment_methods.length) fail(400, 'Add at least one payment method.');
    const list = [...new Set(b.payment_methods.map((m) => V.str(m, 'Payment method', { required: true, max: 40 })))];
    await saveSetting(env, sid, 'payment_methods', list);
  }
  if (b.grading_scale !== undefined) {
    if (!Array.isArray(b.grading_scale) || b.grading_scale.length < 2) fail(400, 'The grading scale needs at least two grades.');
    const scale = b.grading_scale.map((g) => ({
      min: V.num(g.min, 'Minimum %', { required: true, min: 0, max: 100 }),
      grade: V.str(g.grade, 'Grade', { required: true, max: 4 }),
      points: V.num(g.points, 'Points', { required: true, min: 0, max: 20 }),
      remark: V.str(g.remark, 'Remark', { max: 40 }) || '',
    })).sort((x, y) => y.min - x.min);
    if (scale[scale.length - 1].min !== 0) fail(400, 'The lowest grade must start at 0%.');
    await saveSetting(env, sid, 'grading_scale', scale);
  }
  if (b.division !== undefined) {
    const d = b.division || {};
    const bands = (d.bands || []).map((x) => ({ max: V.num(x.max, 'Division points', { required: true, min: 0 }), name: V.str(x.name, 'Division name', { required: true, max: 6 }) }))
      .sort((x, y) => x.max - y.max);
    await saveSetting(env, sid, 'division', {
      enabled: !!d.enabled, best_of: V.int(d.best_of, 'Best subjects', { required: true, min: 1, max: 20 }),
      bands, fallback: V.str(d.fallback, 'Fallback division', { max: 6 }) || '0',
    });
  }
  if (b.absence_alert_threshold !== undefined) {
    await saveSetting(env, sid, 'absence_alert_threshold', V.int(b.absence_alert_threshold, 'Absence alert', { required: true, min: 1, max: 31 }));
  }
  for (const k of ['receipt_footer', 'receipt_prefix', 'id_card_note']) {
    if (b[k] !== undefined) {
      const val = V.str(b[k], k, { max: 300 }) || '';
      if (k === 'receipt_prefix' && !/^[A-Za-z0-9]{1,8}$/.test(val)) fail(400, 'Receipt prefix must be 1–8 letters or numbers.');
      await saveSetting(env, sid, k, k === 'receipt_prefix' ? val.toUpperCase() : val);
    }
  }
  await audit(env, request, ctx, 'settings.update', 'settings', null, Object.keys(b).join(', '));
  return json({ ok: true, settings: await getSettings(env, sid) });
});

// ---------------------------------------------------------------------
// Academic years & terms
// ---------------------------------------------------------------------
export const listYears = secure({ parent: true }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare('SELECT * FROM sch_academic_years WHERE school_id = ? ORDER BY name DESC').bind(ctx.school.id).all();
  const { results: terms } = await env.DB.prepare('SELECT * FROM sch_terms WHERE school_id = ? ORDER BY sort_order, id').bind(ctx.school.id).all();
  return json({ years: results, terms });
});

export const saveYear = secure({ perm: 'settings.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, 'Academic year', { required: true, max: 20 });
  const start = V.date(b.start_date, 'Start date');
  const end = V.date(b.end_date, 'End date');
  if (start && end && end < start) fail(400, 'The end date cannot be before the start date.');
  const sid = ctx.school.id;
  let id = params.id ? Number(params.id) : null;
  const clash = await env.DB.prepare('SELECT id FROM sch_academic_years WHERE school_id = ? AND name = ? AND id != ?').bind(sid, name, id || 0).first();
  if (clash) fail(409, `An academic year called "${name}" already exists.`);
  if (id) {
    const own = await env.DB.prepare('SELECT id FROM sch_academic_years WHERE id = ? AND school_id = ?').bind(id, sid).first();
    if (!own) fail(404, 'Academic year not found.');
    await env.DB.prepare('UPDATE sch_academic_years SET name = ?, start_date = ?, end_date = ? WHERE id = ?').bind(name, start, end, id).run();
  } else {
    const r = await env.DB.prepare('INSERT INTO sch_academic_years (school_id, name, start_date, end_date, is_current) VALUES (?, ?, ?, ?, 0)').bind(sid, name, start, end).run();
    id = r.meta.last_row_id;
  }
  if (b.is_current) {
    await env.DB.batch([
      env.DB.prepare('UPDATE sch_academic_years SET is_current = 0 WHERE school_id = ?').bind(sid),
      env.DB.prepare('UPDATE sch_academic_years SET is_current = 1 WHERE id = ?').bind(id),
    ]);
  }
  await audit(env, request, ctx, 'settings.year', 'academic_year', id, name);
  return json({ ok: true, id }, { status: params.id ? 200 : 201 });
});

export const deleteYear = secure({ perm: 'settings.manage' }, async ({ request, env, params, ctx }) => {
  const sid = ctx.school.id;
  const y = await env.DB.prepare('SELECT * FROM sch_academic_years WHERE id = ? AND school_id = ?').bind(params.id, sid).first();
  if (!y) fail(404, 'Academic year not found.');
  if (y.is_current) fail(400, 'You cannot delete the current academic year. Make another year current first.');
  const used = await env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM sch_classes WHERE academic_year_id = ?1) + (SELECT COUNT(*) FROM sch_enrollments WHERE academic_year_id = ?1) +
            (SELECT COUNT(*) FROM sch_payments WHERE academic_year_id = ?1) AS n`
  ).bind(y.id).first();
  if (used.n > 0) fail(409, 'This academic year already has classes, students or payments and cannot be deleted.');
  await env.DB.prepare('DELETE FROM sch_academic_years WHERE id = ?').bind(y.id).run();
  await audit(env, request, ctx, 'settings.year.delete', 'academic_year', y.id, y.name);
  return json({ ok: true });
});

export const saveTerm = secure({ perm: 'settings.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, 'Term name', { required: true, max: 40 });
  const order = V.int(b.sort_order, 'Order', { min: 0, max: 50 }) ?? 0;
  const sid = ctx.school.id;
  const clash = await env.DB.prepare('SELECT id FROM sch_terms WHERE school_id = ? AND name = ? AND id != ?').bind(sid, name, params.id || 0).first();
  if (clash) fail(409, `A term called "${name}" already exists.`);
  if (params.id) {
    const r = await env.DB.prepare('UPDATE sch_terms SET name = ?, sort_order = ? WHERE id = ? AND school_id = ?').bind(name, order, params.id, sid).run();
    if (!r.meta.changes) fail(404, 'Term not found.');
    return json({ ok: true });
  }
  const r = await env.DB.prepare('INSERT INTO sch_terms (school_id, name, sort_order) VALUES (?, ?, ?)').bind(sid, name, order).run();
  await audit(env, request, ctx, 'settings.term', 'term', r.meta.last_row_id, name);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});

export const deleteTerm = secure({ perm: 'settings.manage' }, async ({ env, params, ctx }) => {
  await env.DB.prepare('DELETE FROM sch_terms WHERE id = ? AND school_id = ?').bind(params.id, ctx.school.id).run();
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Roles & permissions
// ---------------------------------------------------------------------
export const getPermissions = secure({ perm: ['settings.manage', 'users.manage'] }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare('SELECT role, permission FROM sch_role_permissions WHERE school_id = ?').bind(ctx.school.id).all();
  const matrix = { admin: ALL_PERMISSION_KEYS, teacher: [], receptionist: [] };
  results.forEach((r) => { if (matrix[r.role]) matrix[r.role].push(r.permission); });
  return json({ catalogue: PERMISSIONS, matrix, defaults: DEFAULT_ROLE_PERMISSIONS });
});

export const savePermissions = secure({ perm: 'settings.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const role = V.oneOf(b.role, 'Role', ['teacher', 'receptionist'], { required: true });
  const perms = [...new Set((b.permissions || []).map(String))];
  if (perms.some((p) => !ALL_PERMISSION_KEYS.includes(p))) fail(400, 'Unknown permission in the list.');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sch_role_permissions WHERE school_id = ? AND role = ?').bind(ctx.school.id, role),
    ...perms.map((p) => env.DB.prepare('INSERT INTO sch_role_permissions (school_id, role, permission) VALUES (?, ?, ?)').bind(ctx.school.id, role, p)),
  ]);
  await audit(env, request, ctx, 'settings.permissions', 'role', null, `${role}: ${perms.length} permissions`);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Users (logins that belong to this school)
// ---------------------------------------------------------------------
export const listUsers = secure({ perm: 'users.manage' }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    `SELECT m.id, m.role, m.active, m.created_at, m.teacher_id, m.parent_id, u.id AS user_id, u.name, u.email,
            t.full_name AS teacher_name, p.full_name AS parent_name,
            (SELECT MAX(logged_in_at) FROM login_events le WHERE le.user_id = u.id) AS last_login
     FROM sch_members m JOIN users u ON u.id = m.user_id
     LEFT JOIN sch_teachers t ON t.id = m.teacher_id
     LEFT JOIN sch_parents p ON p.id = m.parent_id
     WHERE m.school_id = ? ORDER BY m.role, u.name`
  ).bind(ctx.school.id).all();
  return json({ users: results });
});

// Creates (or links) a login. Used by Users, Teachers and Parents screens.
export async function createLogin(env, ctx, { name, email, password, role, teacherId = null, parentId = null }) {
  const existing = await env.DB.prepare('SELECT id, name FROM users WHERE email = ?').bind(email).first();
  let userId; let linked = false;
  if (existing) {
    userId = existing.id; linked = true;
    const m = await env.DB.prepare('SELECT id FROM sch_members WHERE school_id = ? AND user_id = ?').bind(ctx.school.id, userId).first();
    if (m) fail(409, 'This person already has a login for your school.');
  } else {
    const { hash, salt } = await hashPassword(V.password(password, 'Temporary password'));
    const r = await env.DB.prepare('INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)')
      .bind(name, email, hash, salt, 'user').run();
    userId = r.meta.last_row_id;
  }
  await env.DB.prepare('INSERT INTO sch_members (school_id, user_id, role, teacher_id, parent_id) VALUES (?, ?, ?, ?, ?)')
    .bind(ctx.school.id, userId, role, teacherId, parentId).run();
  return { userId, linked };
}

export const addUser = secure({ perm: 'users.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, 'Full name', { required: true, max: 100 });
  const email = V.email(b.email, 'Email', { required: true });
  const role = V.oneOf(b.role, 'Role', ['admin', 'teacher', 'receptionist'], { required: true });
  let teacherId = null;
  if (role === 'teacher') {
    if (b.teacher_id) {
      const t = await env.DB.prepare('SELECT id FROM sch_teachers WHERE id = ? AND school_id = ?').bind(b.teacher_id, ctx.school.id).first();
      if (!t) fail(400, 'That teacher record was not found.');
      teacherId = t.id;
    } else {
      const t = await env.DB.prepare('INSERT INTO sch_teachers (school_id, full_name, email) VALUES (?, ?, ?)').bind(ctx.school.id, name, email).run();
      teacherId = t.meta.last_row_id;
    }
  }
  const { userId, linked } = await createLogin(env, ctx, { name, email, password: b.password, role, teacherId });
  if (teacherId) await env.DB.prepare('UPDATE sch_teachers SET user_id = ? WHERE id = ?').bind(userId, teacherId).run();
  await audit(env, request, ctx, 'user.create', 'user', userId, `${email} as ${role}`);
  return json({ ok: true, user_id: userId, linked }, { status: 201 });
});

export const updateUser = secure({ perm: 'users.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const m = await env.DB.prepare('SELECT * FROM sch_members WHERE id = ? AND school_id = ?').bind(params.id, ctx.school.id).first();
  if (!m) fail(404, 'User not found.');
  const role = b.role !== undefined ? V.oneOf(b.role, 'Role', ROLES.filter((r) => r !== 'parent'), { required: true }) : m.role;
  const active = b.active === undefined ? m.active : (b.active ? 1 : 0);
  if (m.role === 'parent') { if (b.role !== undefined && role !== 'parent') fail(400, 'Parent logins cannot be changed into staff logins.'); }
  if ((m.role === 'admin' && (role !== 'admin' || !active))) {
    const others = await env.DB.prepare(`SELECT COUNT(*) AS n FROM sch_members WHERE school_id = ? AND role = 'admin' AND active = 1 AND id != ?`).bind(ctx.school.id, m.id).first();
    if (!others.n) fail(400, 'Your school needs at least one active administrator.');
  }
  await env.DB.prepare('UPDATE sch_members SET role = ?, active = ? WHERE id = ?').bind(m.role === 'parent' ? 'parent' : role, active, m.id).run();
  if (b.new_password) {
    const other = await env.DB.prepare('SELECT COUNT(*) AS n FROM sch_members WHERE user_id = ? AND school_id != ?').bind(m.user_id, ctx.school.id).first();
    if (other.n) fail(400, 'This person also belongs to another school, so only they can change their password.');
    const { hash, salt } = await hashPassword(V.password(b.new_password, 'New password'));
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').bind(hash, salt, m.user_id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(m.user_id),
    ]);
  }
  await audit(env, request, ctx, 'user.update', 'user', m.user_id, `${m.role}→${role}, active=${active}${b.new_password ? ', password reset' : ''}`);
  return json({ ok: true });
});
