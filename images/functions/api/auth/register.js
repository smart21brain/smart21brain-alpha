import { hashPassword, createSession, sessionCookie, json, badRequest } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body || !body.name || !body.email || !body.password) {
    return badRequest('Name, email and password are required.');
  }
  const email = String(body.email).trim().toLowerCase();
  if (body.password.length < 8) {
    return badRequest('Password must be at least 8 characters.');
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return badRequest('An account with that email already exists.');

  const { hash, salt } = await hashPassword(body.password);
  const result = await env.DB.prepare(
    'INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)'
  ).bind(String(body.name).trim(), email, hash, salt, 'user').run();

  const userId = result.meta.last_row_id;
  const { token, expires } = await createSession(env.DB, userId);

  return json(
    { user: { id: userId, name: body.name, email, role: 'user' } },
    { status: 201, headers: { 'Set-Cookie': sessionCookie(token, expires) } }
  );
}
