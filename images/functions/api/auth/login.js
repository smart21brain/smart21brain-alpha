import { verifyPassword, createSession, sessionCookie, json, badRequest, unauthorized } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body || !body.email || !body.password) {
    return badRequest('Email and password are required.');
  }
  const email = String(body.email).trim().toLowerCase();

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!user) return unauthorized('Incorrect email or password.');

  const valid = await verifyPassword(body.password, user.password_hash, user.password_salt);
  if (!valid) return unauthorized('Incorrect email or password.');

  const { token, expires } = await createSession(env.DB, user.id);

  return json(
    { user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_key: user.avatar_key } },
    { headers: { 'Set-Cookie': sessionCookie(token, expires) } }
  );
}
