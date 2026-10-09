import { getSessionUser, json, badRequest, unauthorized, forbidden, notFound } from '../lib/auth.js';

const ALLOWED_ROLES = ['user', 'teacher', 'parent', 'admin'];

// Admin only: list all users, most recent first.
export async function listUsers({ request, env }) {
  const admin = await getSessionUser(request, env.DB);
  if (!admin) return unauthorized();
  if (admin.role !== 'admin') return forbidden();

  const { results } = await env.DB.prepare(
    'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
  ).all();
  return json({ users: results });
}

// Admin only: change another user's role (Student/Parent/Teacher/Admin).
// An admin can't change their own role here, to avoid accidentally
// locking themselves out of the admin portal.
export async function updateUserRole({ request, params, env }) {
  const admin = await getSessionUser(request, env.DB);
  if (!admin) return unauthorized();
  if (admin.role !== 'admin') return forbidden();

  const targetId = Number(params.id);
  if (targetId === admin.id) {
    return badRequest("You can't change your own role. Ask another admin to do it.");
  }

  const body = await request.json().catch(() => null);
  const role = String(body?.role || '').toLowerCase();
  if (!ALLOWED_ROLES.includes(role)) {
    return badRequest(`role must be one of: ${ALLOWED_ROLES.join(', ')}`);
  }

  const target = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(targetId).first();
  if (!target) return notFound();

  await env.DB.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, targetId).run();
  return json({ ok: true });
}
