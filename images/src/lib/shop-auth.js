// Smart21Shop — shared tenant, role and helper library.
//
// Accounts are the normal smart21brain accounts (users + sessions tables).
// What a person may do INSIDE a shop comes from shp_members (which shop,
// which role) and shp_role_permissions (what each role can do — every shop
// can change this from Settings). Every shop-scoped query must include
// `shop_id = ctx.shop.id`.
//
// The generic helpers (validation, image upload, errors) are shared with the
// School System so both systems behave the same way.

import { getSessionUser, json } from './auth.js';
import {
  HttpError, fail, V, readJson, safeJson, likeTerm, chunk, paging,
  storeImage, imageResponse, randomToken, errorResponse, assertSameOrigin,
} from './school-auth.js';

export {
  HttpError, fail, V, readJson, safeJson, likeTerm, chunk, paging,
  storeImage, imageResponse, randomToken, errorResponse, assertSameOrigin,
};

export const ROLES = ['owner', 'manager', 'cashier'];

// Permission catalogue — also sent to the UI to draw the Roles & Permissions
// screen, so a new permission only has to be added here.
export const PERMISSIONS = [
  { group: 'Customers', key: 'customers.view',   label: 'View customers' },
  { group: 'Customers', key: 'customers.create', label: 'Save new customers' },
  { group: 'Customers', key: 'customers.edit',   label: 'Edit customers' },
  { group: 'Customers', key: 'customers.delete', label: 'Delete customers' },
  { group: 'Customers', key: 'customers.notes',  label: 'Add private notes about customers' },
  { group: 'Products',  key: 'products.view',    label: 'View products & stock' },
  { group: 'Products',  key: 'products.manage',  label: 'Add, edit & delete products' },
  { group: 'Products',  key: 'stock.adjust',     label: 'Receive & adjust stock' },
  { group: 'Sales',     key: 'sales.create',     label: 'Make sales (Point of Sale)' },
  { group: 'Sales',     key: 'sales.view',       label: 'View all sales & receipts' },
  { group: 'Sales',     key: 'sales.discount',   label: 'Give discounts & change prices at the till' },
  { group: 'Sales',     key: 'sales.void',       label: 'Cancel (void) sales' },
  { group: 'Money',     key: 'payments.record',  label: 'Receive customer payments' },
  { group: 'Money',     key: 'expenses.manage',  label: 'Record & view expenses' },
  { group: 'Money',     key: 'profit.view',      label: 'See cost prices & profit' },
  { group: 'System',    key: 'reports.view',     label: 'View reports' },
  { group: 'System',    key: 'users.manage',     label: 'Manage staff logins' },
  { group: 'System',    key: 'settings.manage',  label: 'Change shop settings' },
  { group: 'System',    key: 'audit.view',       label: 'View activity log' },
];
export const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

export const DEFAULT_ROLE_PERMISSIONS = {
  owner: ALL_PERMISSION_KEYS,
  manager: ALL_PERMISSION_KEYS.filter((k) => !['users.manage', 'settings.manage'].includes(k)),
  cashier: ['customers.view', 'customers.create', 'products.view', 'sales.create', 'sales.view', 'payments.record'],
};

export const DEFAULT_PAYMENT_METHODS = ['Cash', 'Mobile Money', 'Bank', 'Card', 'Other'];

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// ---------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------
export async function getShopContext(request, env) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return { error: json({ error: 'Please sign in to continue.', code: 'unauthorized' }, { status: 401 }) };

  const url = new URL(request.url);
  const wanted = Number(request.headers.get('X-Shop-Id') || url.searchParams.get('shop_id') || 0);

  const sql = `SELECT m.id AS member_id, m.role, s.*
               FROM shp_members m JOIN shp_shops s ON s.id = m.shop_id
               WHERE m.user_id = ? AND m.active = 1 ${wanted ? 'AND m.shop_id = ?' : ''}
               ORDER BY m.id ASC LIMIT 1`;
  let row = await (wanted ? env.DB.prepare(sql).bind(user.id, wanted) : env.DB.prepare(sql).bind(user.id)).first();
  if (!row && wanted) {
    // Stale or foreign shop id: fall back to the person's own first shop.
    row = await env.DB.prepare(sql.replace('AND m.shop_id = ?', '')).bind(user.id).first();
  }

  const ctx = { user, shop: null, role: null, perms: new Set(), off: 180, _cache: {} };
  if (!row) return ctx;

  ctx.shop = {
    id: row.id, name: row.name, short_name: row.short_name, logo_key: row.logo_key, phone: row.phone,
    email: row.email, address: row.address, website: row.website, tax_no: row.tax_no,
    currency: row.currency, primary_color: row.primary_color, tax_rate: Number(row.tax_rate) || 0,
    utc_offset_min: Number.isInteger(row.utc_offset_min) ? row.utc_offset_min : 180, receipt_note: row.receipt_note,
  };
  ctx.off = ctx.shop.utc_offset_min;
  ctx.role = row.role;

  if (ctx.role === 'owner') {
    ALL_PERMISSION_KEYS.forEach((k) => ctx.perms.add(k));
  } else {
    const { results } = await env.DB.prepare(
      'SELECT permission FROM shp_role_permissions WHERE shop_id = ? AND role = ?'
    ).bind(ctx.shop.id, ctx.role).all();
    results.forEach((r) => ctx.perms.add(r.permission));
  }
  return ctx;
}

export const can = (ctx, perm) => ctx.role === 'owner' || ctx.perms.has(perm);

// Wraps a handler: sign-in check, tenant check, permission check, CSRF-style
// origin check on writes, and turns thrown HttpErrors into JSON responses.
//   opts.perm    one permission key, or an array meaning "any of these"
//   opts.roles   restrict to these roles
//   opts.shop    false = endpoint works even before a shop exists
export function secure(opts, fn) {
  if (typeof opts === 'function') { fn = opts; opts = {}; }
  return async ({ request, env, params, url }) => {
    try {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) assertSameOrigin(request);
      const ctx = await getShopContext(request, env);
      if (ctx.error) return ctx.error;
      if (!ctx.shop) {
        if (opts.shop === false) return await fn({ request, env, params, url, ctx });
        return json({ error: 'You are not part of a shop yet.', code: 'no_shop' }, { status: 403 });
      }
      if (opts.roles && !opts.roles.includes(ctx.role)) fail(403, 'You do not have access to this.');
      if (opts.perm) {
        const list = Array.isArray(opts.perm) ? opts.perm : [opts.perm];
        if (!list.some((p) => can(ctx, p))) fail(403, 'You do not have permission to do this. Ask the shop owner.');
      }
      return await fn({ request, env, params, url, ctx });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

// ---------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------
export async function getSettings(env, shopId) {
  const { results } = await env.DB.prepare('SELECT key, value FROM shp_settings WHERE shop_id = ?').bind(shopId).all();
  const raw = {};
  results.forEach((r) => { raw[r.key] = safeJson(r.value, r.value); });
  return {
    payment_methods: Array.isArray(raw.payment_methods) && raw.payment_methods.length ? raw.payment_methods : DEFAULT_PAYMENT_METHODS,
    receipt_footer: typeof raw.receipt_footer === 'string' ? raw.receipt_footer : 'Thank you for shopping with us!',
    receipt_prefix: typeof raw.receipt_prefix === 'string' && raw.receipt_prefix ? raw.receipt_prefix : 'RCT',
    customer_prefix: typeof raw.customer_prefix === 'string' && raw.customer_prefix ? raw.customer_prefix : 'C',
    // How many currency units a customer must spend to earn 1 loyalty point (0 = loyalty is off).
    loyalty_rate: Number(raw.loyalty_rate) > 0 ? Number(raw.loyalty_rate) : 0,
    allow_negative_stock: raw.allow_negative_stock === true,
    expense_categories: Array.isArray(raw.expense_categories) && raw.expense_categories.length ? raw.expense_categories : ['Rent', 'Electricity & water', 'Transport', 'Salaries', 'Stock purchase', 'Marketing', 'Repairs', 'Other'],
  };
}

export async function saveSetting(env, shopId, key, value) {
  await env.DB.prepare(
    `INSERT INTO shp_settings (shop_id, key, value) VALUES (?, ?, ?)
     ON CONFLICT(shop_id, key) DO UPDATE SET value = excluded.value`
  ).bind(shopId, key, JSON.stringify(value)).run();
}

// ---------------------------------------------------------------------
// Dates in the shop's own time zone (SQLite stores UTC)
// ---------------------------------------------------------------------
export const offsetMin = (ctx) => (Number.isInteger(ctx.off) ? ctx.off : 180);
// SQL expression: the local calendar date of a UTC column, e.g. localDate('s.created_at', 180)
export const localDate = (col, off) => `date(${col}, '${Number(off) | 0} minutes')`;
// Today's date (YYYY-MM-DD) in the shop's time zone
export const shopToday = (off) => new Date(Date.now() + (Number(off) | 0) * 60000).toISOString().slice(0, 10);
export const addDays = (ymd, n) => new Date(Date.parse(ymd + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);

// ---------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------
export async function audit(env, request, ctx, action, entity, entityId, details) {
  try {
    await env.DB.prepare(
      `INSERT INTO shp_audit_logs (shop_id, user_id, action, entity, entity_id, details, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      ctx.shop.id, ctx.user ? ctx.user.id : null, action, entity || null, entityId || null,
      details == null ? null : String(typeof details === 'string' ? details : JSON.stringify(details)).slice(0, 1000),
      request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || null,
      (request.headers.get('User-Agent') || '').slice(0, 250) || null
    ).run();
  } catch (e) { /* an audit failure must never break the real action */ }
}

export function formatReceiptNo(prefix, seq) {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}
