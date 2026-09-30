import {
  hashPassword, verifyPassword, createSession, sessionCookie, clearSessionCookie,
  getSessionUser, json, badRequest, unauthorized,
} from '../lib/auth.js';

const AVATAR_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
// DB roles. The register form's "Student" option maps to 'user' (the
// student/general dashboard.html role) to match the rest of the codebase.
const ALLOWED_ROLES = ['user', 'teacher', 'parent', 'admin'];

export async function register({ request, env }) {
  const contentType = request.headers.get('Content-Type') || '';
  let name, email, password, role, adminCode, avatarFile = null;

  if (contentType.includes('multipart/form-data')) {
    // Registration with an optional profile photo comes in as multipart
    // form data (fields: name, email, password, role, admin_code, and a
    // file field "avatar").
    const form = await request.formData().catch(() => null);
    if (!form) return badRequest('Could not read the submitted form.');
    name = form.get('name');
    email = form.get('email');
    password = form.get('password');
    role = form.get('role');
    adminCode = form.get('admin_code');
    const file = form.get('avatar');
    if (file && typeof file !== 'string' && file.size > 0) avatarFile = file;
  } else {
    const body = await request.json().catch(() => null);
    name = body?.name;
    email = body?.email;
    password = body?.password;
    role = body?.role;
    adminCode = body?.admin_code;
  }

  if (!name || !email || !password) {
    return badRequest('Name, email and password are required.');
  }
  email = String(email).trim().toLowerCase();
  if (String(password).length < 8) return badRequest('Password must be at least 8 characters.');

  role = String(role || 'user').toLowerCase();
  if (!ALLOWED_ROLES.includes(role)) role = 'user';
  // Self-service admin signup is gated behind a secret invite code (set
  // ADMIN_SIGNUP_CODE via `wrangler secret put`) — otherwise anyone could
  // grant themselves full admin control of the site.
  if (role === 'admin') {
    if (!env.ADMIN_SIGNUP_CODE || String(adminCode || '') !== env.ADMIN_SIGNUP_CODE) {
      return badRequest('A valid admin invite code is required to create an admin account.');
    }
  }

  if (avatarFile) {
    if (!AVATAR_TYPES[avatarFile.type]) {
      return badRequest('Profile photo must be a PNG, JPG, WEBP or GIF image.');
    }
    if (avatarFile.size > MAX_AVATAR_BYTES) {
      return badRequest('Profile photo is too large (5MB max).');
    }
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return badRequest('An account with that email already exists.');

  const { hash, salt } = await hashPassword(password);
  const cleanName = String(name).trim();
  const result = await env.DB.prepare(
    'INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)'
  ).bind(cleanName, email, hash, salt, role).run();

  const userId = result.meta.last_row_id;

  let avatarKey = null;
  if (avatarFile) {
    avatarKey = `avatars/${userId}-${crypto.randomUUID()}.${AVATAR_TYPES[avatarFile.type]}`;
    await env.MATERIALS.put(avatarKey, await avatarFile.arrayBuffer(), {
      httpMetadata: { contentType: avatarFile.type },
    });
    await env.DB.prepare('UPDATE users SET avatar_key = ? WHERE id = ?').bind(avatarKey, userId).run();
  }

  const { token, expires } = await createSession(env.DB, userId);

  return json(
    { user: { id: userId, name: cleanName, email, role, avatar_key: avatarKey } },
    { status: 201, headers: { 'Set-Cookie': sessionCookie(token, expires) } }
  );
}

export async function login({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body || !body.email || !body.password) return badRequest('Email and password are required.');
  const email = String(body.email).trim().toLowerCase();

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!user) return unauthorized('Incorrect email or password.');

  const valid = await verifyPassword(body.password, user.password_hash, user.password_salt);
  if (!valid) return unauthorized('Incorrect email or password.');

  const { token, expires } = await createSession(env.DB, user.id);
  await env.DB.prepare(
    'INSERT INTO login_events (user_id, ip_address, user_agent) VALUES (?, ?, ?)'
  ).bind(
    user.id,
    request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || null,
    request.headers.get('User-Agent') || null
  ).run();

  return json(
    { user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_key: user.avatar_key } },
    { headers: { 'Set-Cookie': sessionCookie(token, expires) } }
  );
}

export async function logout({ request, env }) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(/(?:^|;\s*)s21_session=([^;]+)/);
  if (match) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(match[1]).run();
  return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } });
}

export async function me({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  return json({ user: user || null });
}
