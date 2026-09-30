import { json, badRequest, notFound } from '../../lib/auth.js';
import { getStationeryContext, requirePermission, logAudit, ROLES } from '../../lib/stationery-auth.js';

// GET /api/stationery/context — who am I, which business, which role.
// Also lists every business the user belongs to, for a business switcher.
export async function getContext({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  const { results: memberships } = await env.DB.prepare(
    `SELECT b.id, b.name, s.role FROM stn_staff s JOIN stn_businesses b ON b.id = s.business_id
     WHERE s.user_id = ? AND s.active = 1 ORDER BY b.id ASC`
  ).bind(ctx.user.id).all();

  return json({
    user: { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email },
    business: ctx.business,
    role: ctx.role,
    branch_id: ctx.branchId,
    memberships,
  });
}

export async function updateBusiness({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_business');
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body) return badRequest('Invalid JSON body.');
  const { name, currency, phone, address, receipt_note } = body;

  await env.DB.prepare(
    `UPDATE stn_businesses SET
      name = COALESCE(?, name), currency = COALESCE(?, currency),
      phone = COALESCE(?, phone), address = COALESCE(?, address),
      receipt_note = COALESCE(?, receipt_note)
     WHERE id = ?`
  ).bind(name || null, currency || null, phone || null, address || null, receipt_note || null, ctx.business.id).run();

  await logAudit(env, ctx.business.id, ctx.user.id, 'business.updated', JSON.stringify(body));
  return json({ ok: true });
}

// ---- Staff / Employees -------------------------------------------------

export async function listStaff({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  const { results } = await env.DB.prepare(
    `SELECT s.id, s.role, s.active, s.created_at, u.id AS user_id, u.name, u.email
     FROM stn_staff s JOIN users u ON u.id = s.user_id
     WHERE s.business_id = ? ORDER BY s.created_at ASC`
  ).bind(ctx.business.id).all();

  return json({ staff: results, roles: ROLES });
}

// Add an existing smart21brain user (by email) as staff with a role.
// The person must already have a smart21brain account (register.html) —
// this keeps auth in one place instead of a parallel login system.
export async function addStaff({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_staff');
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const email = String(body?.email || '').trim().toLowerCase();
  const role = String(body?.role || '').trim().toLowerCase();
  if (!email || !ROLES.includes(role)) {
    return badRequest(`email and a valid role (${ROLES.join(', ')}) are required.`);
  }

  const person = await env.DB.prepare('SELECT id, name, email FROM users WHERE email = ?').bind(email).first();
  if (!person) {
    return badRequest('No smart21brain account found for that email yet — ask them to register first, then add them here.');
  }

  const existing = await env.DB.prepare(
    'SELECT id FROM stn_staff WHERE business_id = ? AND user_id = ?'
  ).bind(ctx.business.id, person.id).first();

  if (existing) {
    await env.DB.prepare('UPDATE stn_staff SET role = ?, active = 1 WHERE id = ?').bind(role, existing.id).run();
  } else {
    await env.DB.prepare(
      'INSERT INTO stn_staff (business_id, branch_id, user_id, role) VALUES (?, ?, ?, ?)'
    ).bind(ctx.business.id, ctx.branchId, person.id, role).run();
  }

  await logAudit(env, ctx.business.id, ctx.user.id, 'staff.added', `${person.email} as ${role}`);
  return json({ ok: true, staff: { user_id: person.id, name: person.name, email: person.email, role } }, { status: 201 });
}

export async function updateStaffRole({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_staff');
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const role = String(body?.role || '').trim().toLowerCase();
  const active = body?.active;
  if (role && !ROLES.includes(role)) return badRequest(`role must be one of: ${ROLES.join(', ')}`);

  const staff = await env.DB.prepare('SELECT * FROM stn_staff WHERE id = ? AND business_id = ?')
    .bind(params.id, ctx.business.id).first();
  if (!staff) return notFound();
  if (staff.role === 'owner' && staff.user_id !== ctx.user.id) {
    return badRequest("The owner's role can't be changed here.");
  }

  await env.DB.prepare(
    'UPDATE stn_staff SET role = COALESCE(?, role), active = COALESCE(?, active) WHERE id = ?'
  ).bind(role || null, typeof active === 'boolean' ? (active ? 1 : 0) : null, staff.id).run();

  await logAudit(env, ctx.business.id, ctx.user.id, 'staff.updated', `staff #${staff.id} -> ${role || staff.role}`);
  return json({ ok: true });
}
