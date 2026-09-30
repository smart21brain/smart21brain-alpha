import { getSessionUser, hashPassword, verifyPassword, json, badRequest, unauthorized, notFound } from '../lib/auth.js';

const AVATAR_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

async function currentUser(request, env) {
  return getSessionUser(request, env.DB);
}

export async function updateProfile({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return badRequest('Name and a valid email are required.');
  const duplicate = await env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?').bind(email, user.id).first();
  if (duplicate) return badRequest('That email address is already in use.');
  await env.DB.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').bind(name, email, user.id).run();
  return json({ user: { ...user, name, email } });
}

export async function updatePassword({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body?.currentPassword || typeof body.newPassword !== 'string' || body.newPassword.length < 8) {
    return badRequest('Current password and a new password of at least 8 characters are required.');
  }
  const stored = await env.DB.prepare('SELECT password_hash, password_salt FROM users WHERE id = ?').bind(user.id).first();
  if (!stored || !(await verifyPassword(body.currentPassword, stored.password_hash, stored.password_salt))) {
    return badRequest('Current password is incorrect.');
  }
  const { hash, salt } = await hashPassword(body.newPassword);
  await env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').bind(hash, salt, user.id).run();
  return json({ updated: true });
}

export async function getProfile({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return unauthorized();
  return json({ user });
}

// Public: serves a user's uploaded profile photo so it can be used
// directly as an <img src="/api/avatar/:id">. Returns 404 if the user
// has no avatar_key or the object is missing from R2.
export async function getAvatar({ params, env }) {
  const user = await env.DB.prepare('SELECT avatar_key FROM users WHERE id = ?').bind(params.id).first();
  if (!user || !user.avatar_key) return notFound();

  const object = await env.MATERIALS.get(user.avatar_key);
  if (!object) return notFound('Avatar file missing from storage.');

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=3600');
  return new Response(object.body, { headers });
}

// Lets a signed-in user replace their own profile photo.
// Expects multipart/form-data with a file field named "avatar".
export async function updateAvatar({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return unauthorized();

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return badRequest('Expected multipart/form-data with an "avatar" file.');
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get('avatar');
  if (!form || !file || typeof file === 'string' || file.size === 0) {
    return badRequest('An image file is required.');
  }
  if (!AVATAR_TYPES[file.type]) {
    return badRequest('Profile photo must be a PNG, JPG, WEBP or GIF image.');
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return badRequest('Profile photo is too large (5MB max).');
  }

  const previousKey = user.avatar_key;
  const newKey = `avatars/${user.id}-${crypto.randomUUID()}.${AVATAR_TYPES[file.type]}`;
  await env.MATERIALS.put(newKey, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });
  await env.DB.prepare('UPDATE users SET avatar_key = ? WHERE id = ?').bind(newKey, user.id).run();

  if (previousKey) {
    await env.MATERIALS.delete(previousKey).catch(() => {});
  }

  return json({ user: { ...user, avatar_key: newKey } });
}