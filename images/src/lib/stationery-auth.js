// smart21brain Stationery OS — shared tenant/role helpers.
// A user's global users.role (student/teacher/parent/admin) is unrelated
// to their role *inside* a stationery business. Every signed-in user gets
// (or already has) exactly one "home" business the first time they open
// the app, auto-provisioned with sensible defaults, unless they were
// already invited as staff into someone else's business.

import { getSessionUser, unauthorized, forbidden } from './auth.js';

export const ROLES = ['owner', 'manager', 'operator', 'designer', 'accountant'];

// Role -> which modules they can write to. Read access inside a business
// is generally allowed for any active staff member; these gates are for
// mutating actions (POS checkout excluded — every active staff role may
// operate the counter).
export const PERMISSIONS = {
  manage_staff:    ['owner', 'manager'],
  manage_pricing:  ['owner', 'manager'],
  manage_business: ['owner'],
  manage_finance:  ['owner', 'manager', 'accountant'],
  manage_inventory:['owner', 'manager', 'operator'],
  view_reports:    ['owner', 'manager', 'accountant'],
  manage_orders:   ['owner', 'manager', 'operator', 'designer'],
  manage_design:   ['owner', 'manager', 'designer', 'operator'],
  manage_backup:   ['owner'],
};

export function can(role, permission) {
  const allowed = PERMISSIONS[permission];
  return !allowed || allowed.includes(role);
}

// Resolves { user, business, role, branchId } for the current request.
// If the signed-in user has no business yet (and isn't staff anywhere),
// a starter business + defaults are created for them automatically so
// the app is usable the instant someone logs in.
export async function getStationeryContext(request, env) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return { error: unauthorized() };

  const url = new URL(request.url);
  const requestedBusinessId = url.searchParams.get('business_id');

  let staff = null;
  if (requestedBusinessId) {
    staff = await env.DB.prepare(
      `SELECT s.*, b.name AS business_name, b.currency, b.receipt_note, b.phone AS business_phone, b.address AS business_address
       FROM stn_staff s JOIN stn_businesses b ON b.id = s.business_id
       WHERE s.user_id = ? AND s.business_id = ? AND s.active = 1`
    ).bind(user.id, requestedBusinessId).first();
  } else {
    staff = await env.DB.prepare(
      `SELECT s.*, b.name AS business_name, b.currency, b.receipt_note, b.phone AS business_phone, b.address AS business_address
       FROM stn_staff s JOIN stn_businesses b ON b.id = s.business_id
       WHERE s.user_id = ? AND s.active = 1 ORDER BY s.id ASC LIMIT 1`
    ).bind(user.id).first();
  }

  if (!staff) {
    const provisioned = await provisionBusiness(env, user);
    staff = provisioned;
  }

  const branch = await env.DB.prepare(
    'SELECT id FROM stn_branches WHERE business_id = ? ORDER BY is_main DESC, id ASC LIMIT 1'
  ).bind(staff.business_id).first();

  return {
    user,
    business: {
      id: staff.business_id,
      name: staff.business_name,
      currency: staff.currency,
      receipt_note: staff.receipt_note,
      phone: staff.business_phone,
      address: staff.business_address,
    },
    role: staff.role,
    branchId: staff.branch_id || branch?.id || null,
  };
}

async function provisionBusiness(env, user) {
  const bizResult = await env.DB.prepare(
    `INSERT INTO stn_businesses (name, owner_user_id, currency) VALUES (?, ?, 'TZS')`
  ).bind(`${user.name || 'My'}'s Stationery Shop`, user.id).run();
  const businessId = bizResult.meta.last_row_id;

  const branchResult = await env.DB.prepare(
    `INSERT INTO stn_branches (business_id, name, is_main) VALUES (?, 'Main Branch', 1)`
  ).bind(businessId).run();
  const branchId = branchResult.meta.last_row_id;

  await env.DB.prepare(
    `INSERT INTO stn_staff (business_id, branch_id, user_id, role) VALUES (?, ?, ?, 'owner')`
  ).bind(businessId, branchId, user.id).run();

  // Default pricing (from the product brief) — Owner can edit anytime.
  const defaultServices = [
    ['Photocopy Black & White', 'Copying', 'page', 100],
    ['Photocopy Colour', 'Copying', 'page', 500],
    ['Passport Photo', 'Photo Studio', 'set', 2000],
    ['Scanning', 'Digital', 'page', 500],
    ['Lamination', 'Finishing', 'sheet', 1000],
    ['Binding', 'Finishing', 'book', 2000],
    ['Printing Black & White', 'Printing', 'page', 100],
    ['Printing Colour', 'Printing', 'page', 500],
  ];
  for (const [name, category, unit, price] of defaultServices) {
    await env.DB.prepare(
      `INSERT INTO stn_services (business_id, name, category, unit, unit_price) VALUES (?, ?, ?, ?, ?)`
    ).bind(businessId, name, category, unit, price).run();
  }

  const defaultInventory = [
    ['A4 Paper', 'Paper', 'ream', 20, 5, 8000],
    ['A3 Paper', 'Paper', 'ream', 5, 2, 15000],
    ['Photo Paper (Glossy)', 'Paper', 'pack', 10, 3, 12000],
    ['Black Toner', 'Ink/Toner', 'cartridge', 2, 1, 60000],
    ['Colour Toner Set', 'Ink/Toner', 'set', 1, 1, 150000],
    ['Binding Covers (Clear)', 'Finishing', 'pcs', 50, 10, 300],
    ['Laminating Pouches A4', 'Finishing', 'pcs', 100, 20, 200],
  ];
  for (const [name, category, unit, qty, reorder, cost] of defaultInventory) {
    await env.DB.prepare(
      `INSERT INTO stn_inventory_items (business_id, branch_id, name, category, unit, quantity, reorder_level, cost_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(businessId, branchId, name, category, unit, qty, reorder, cost).run();
  }

  await logAudit(env, businessId, user.id, 'business.provisioned', `${user.name} created a new stationery business`);

  return {
    business_id: businessId,
    branch_id: branchId,
    role: 'owner',
    business_name: `${user.name || 'My'}'s Stationery Shop`,
    currency: 'TZS',
    receipt_note: 'Asante kwa kutuchagua! / Thank you for your business!',
    business_phone: null,
    business_address: null,
  };
}

export async function requirePermission(ctx, permission) {
  if (!can(ctx.role, permission)) {
    return forbidden(`This action needs the ${PERMISSIONS[permission].join(' or ')} role.`);
  }
  return null;
}

export async function logAudit(env, businessId, userId, action, details) {
  try {
    await env.DB.prepare(
      `INSERT INTO stn_audit_log (business_id, user_id, action, details) VALUES (?, ?, ?, ?)`
    ).bind(businessId, userId || null, action, details || null).run();
  } catch (e) { /* audit failures must never break the main action */ }
}

export async function notify(env, businessId, title, message, level = 'info') {
  await env.DB.prepare(
    `INSERT INTO stn_notifications (business_id, title, message, level) VALUES (?, ?, ?, ?)`
  ).bind(businessId, title, message, level).run();
}

export async function nextOrderNo(env, businessId) {
  const { count } = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM stn_orders WHERE business_id = ?'
  ).bind(businessId).first();
  const seq = (count || 0) + 1;
  const y = new Date().getFullYear();
  return `ORD-${y}-${String(seq).padStart(5, '0')}`;
}


