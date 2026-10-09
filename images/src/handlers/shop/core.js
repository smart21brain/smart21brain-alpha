// Smart21Shop — accounts, tenant context, settings, users & permissions.
import { hashPassword, verifyPassword, json } from '../../lib/auth.js';
import {
  fail, secure, readJson, V, audit, getShopContext, getSettings, saveSetting,
  PERMISSIONS, ALL_PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS,
  storeImage, imageResponse, randomToken, errorResponse, assertSameOrigin, ROLES,
} from '../../lib/shop-auth.js';

// ---------------------------------------------------------------------
// Creating a shop (with sensible starter data every shop can edit)
// ---------------------------------------------------------------------
function makeShort(name) {
  const words = String(name).replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const stop = new Set(['of', 'the', 'and', 'shop', 'store', 'stores', 'supermarket', 'ltd', 'limited', 'company', 'co']);
  let letters = words.filter((w) => !stop.has(w.toLowerCase())).map((w) => w[0].toUpperCase()).join('');
  if (letters.length < 2) letters = String(name).replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
  return (letters || 'SHP').slice(0, 5);
}

const STARTER_CATEGORIES = [
  ['General', '#6366F1'], ['Food & Drinks', '#F59E0B'], ['Household', '#10B981'],
  ['Electronics', '#3B82F6'], ['Clothing', '#EC4899'], ['Services', '#8B5CF6'],
];

export async function provisionShop(env, user, info) {
  const short = makeShort(info.name);
  const ins = await env.DB.prepare(
    `INSERT INTO shp_shops (name, short_name, phone, email, address, owner_user_id, receipt_note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(info.name, short, info.phone || null, info.email || null, info.address || null, user.id, 'Thank you for shopping with us!').run();
  const shopId = ins.meta.last_row_id;

  const stmts = [];
  STARTER_CATEGORIES.forEach(([n, color]) => stmts.push(
    env.DB.prepare('INSERT INTO shp_categories (shop_id, name, color) VALUES (?, ?, ?)').bind(shopId, n, color)));
  stmts.push(env.DB.prepare('INSERT INTO shp_members (shop_id, user_id, role) VALUES (?, ?, ?)').bind(shopId, user.id, 'owner'));
  for (const role of ['manager', 'cashier']) {
    for (const p of DEFAULT_ROLE_PERMISSIONS[role]) {
      stmts.push(env.DB.prepare('INSERT INTO shp_role_permissions (shop_id, role, permission) VALUES (?, ?, ?)').bind(shopId, role, p));
    }
  }
  await env.DB.batch(stmts);
  return shopId;
}

async function startSession(env, userId, remember) {
  const token = randomToken(32);
  const days = remember ? 30 : 1;
  const expires = new Date(Date.now() + days * 86400000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').bind(token, userId, expires).run();
  return `s21_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax` + (remember ? `; Expires=${new Date(expires).toUTCString()}` : '');
}

const clientIp = (request) => request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || null;

async function tooManyAttempts(env, email, ip) {
  const a = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM shp_login_attempts WHERE success = 0 AND email = ? AND created_at > datetime('now','-15 minutes')`
  ).bind(email).first();
  if ((a?.n || 0) >= 8) return true;
  if (ip) {
    const b = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM shp_login_attempts WHERE success = 0 AND ip = ? AND created_at > datetime('now','-15 minutes')`
    ).bind(ip).first();
    if ((b?.n || 0) >= 25) return true;
  }
  return false;
}

// POST /api/shop/register-shop — new account + new shop in one step.
export async function registerShop({ request, env }) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const shopName = V.str(body.shop_name, 'Shop name', { required: true, max: 120, min: 2 });
    const name = V.str(body.name, 'Your name', { required: true, max: 100 });
    const email = V.email(body.email, 'Email', { required: true });
    const password = V.password(body.password);
    const phone = V.phone(body.phone, 'Phone number');

    const ip = clientIp(request);
    const recent = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM shp_login_attempts WHERE ip = ? AND email = '(signup)' AND created_at > datetime('now','-1 hour')`
    ).bind(ip).first();
    if (ip && (recent?.n || 0) >= 10) fail(429, 'Too many sign-ups from this connection. Please try again later.');

    const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (exists) fail(409, 'An account with this email already exists. Please sign in instead, then create your shop.');

    const { hash, salt } = await hashPassword(password);
    const u = await env.DB.prepare('INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)')
      .bind(name, email, hash, salt, 'user').run();
    const user = { id: u.meta.last_row_id, name, email };
    const shopId = await provisionShop(env, user, { name: shopName, phone, email });
    await env.DB.prepare(`INSERT INTO shp_login_attempts (email, ip, success) VALUES ('(signup)', ?, 1)`).bind(ip).run();

    const cookie = await startSession(env, user.id, true);
    await audit(env, request, { shop: { id: shopId }, user }, 'shop.create', 'shop', shopId, `Shop "${shopName}" created`);
    return json({ ok: true, shop_id: shopId }, { status: 201, headers: { 'Set-Cookie': cookie } });
  } catch (e) { return errorResponse(e); }
}

// POST /api/shop/shops — a signed-in person creates another shop.
export const createShop = secure({ shop: false }, async ({ request, env, ctx }) => {
  const body = await readJson(request);
  const shopName = V.str(body.shop_name, 'Shop name', { required: true, max: 120, min: 2 });
  const phone = V.phone(body.phone, 'Phone number');
  const owned = await env.DB.prepare('SELECT COUNT(*) AS n FROM shp_shops WHERE owner_user_id = ?').bind(ctx.user.id).first();
  if ((owned?.n || 0) >= 5) fail(400, 'You already own 5 shops. Please contact support for more.');
  const shopId = await provisionShop(env, ctx.user, { name: shopName, phone, email: ctx.user.email });
  await audit(env, request, { shop: { id: shopId }, user: ctx.user }, 'shop.create', 'shop', shopId, `Shop "${shopName}" created`);
  return json({ ok: true, shop_id: shopId }, { status: 201 });
});

// POST /api/shop/login
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
    await env.DB.prepare('INSERT INTO shp_login_attempts (email, ip, success) VALUES (?, ?, ?)').bind(email, ip, ok ? 1 : 0).run();
    if (!ok) fail(401, 'Incorrect email or password.');

    const cookie = await startSession(env, user.id, !!body.remember);
    await env.DB.prepare('INSERT INTO login_events (user_id, ip_address, user_agent) VALUES (?, ?, ?)')
      .bind(user.id, ip, request.headers.get('User-Agent') || null).run();

    const { results: ms } = await env.DB.prepare('SELECT shop_id, role FROM shp_members WHERE user_id = ? AND active = 1 ORDER BY id').bind(user.id).all();
    for (const m of ms) {
      await audit(env, request, { shop: { id: m.shop_id }, user }, 'user.login', 'user', user.id, `Signed in as ${m.role}`);
    }
    return json({ ok: true, has_shop: ms.length > 0, role: ms[0] ? ms[0].role : null }, { headers: { 'Set-Cookie': cookie } });
  } catch (e) { return errorResponse(e); }
}

export async function logout({ request, env }) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(/(?:^|;\s*)s21_session=([^;]+)/);
  if (match) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(match[1]).run();
  return json({ ok: true }, { headers: { 'Set-Cookie': 's21_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0' } });
}

// GET /api/shop/context — who am I, which shop, what may I do.
export async function context({ request, env }) {
  try {
    const ctx = await getShopContext(request, env);
    if (ctx.error) return ctx.error;
    const { results: memberships } = await env.DB.prepare(
      `SELECT s.id, s.name, m.role FROM shp_members m JOIN shp_shops s ON s.id = m.shop_id
       WHERE m.user_id = ? AND m.active = 1 ORDER BY m.id`
    ).bind(ctx.user.id).all();
    const user = { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email };
    if (!ctx.shop) return json({ user, shop: null, memberships });

    const settings = await getSettings(env, ctx.shop.id);
    return json({
      user, shop: { ...ctx.shop, logo_key: undefined, has_logo: !!ctx.shop.logo_key }, role: ctx.role,
      permissions: [...ctx.perms], memberships,
      settings: {
        payment_methods: settings.payment_methods, loyalty_rate: settings.loyalty_rate,
        allow_negative_stock: settings.allow_negative_stock, expense_categories: settings.expense_categories,
      },
    });
  } catch (e) { return errorResponse(e); }
}

// GET /api/shop/lookups — everything the forms need in one call.
export const lookups = secure(async ({ env, ctx }) => {
  const sid = ctx.shop.id;
  const [cats, settings] = await Promise.all([
    env.DB.prepare('SELECT id, name, color FROM shp_categories WHERE shop_id = ? ORDER BY name').bind(sid).all().then((r) => r.results),
    getSettings(env, sid),
  ]);
  return json({ categories: cats, payment_methods: settings.payment_methods });
});

// ---------------------------------------------------------------------
// Shop info & logo
// ---------------------------------------------------------------------
export const getShopInfo = secure({ perm: 'settings.manage' }, async ({ env, ctx }) => {
  const settings = await getSettings(env, ctx.shop.id);
  return json({ shop: ctx.shop, settings });
});

export const updateShopInfo = secure({ perm: 'settings.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, 'Shop name', { required: true, max: 120, min: 2 });
  const shortName = V.str(b.short_name, 'Short name', { required: true, max: 8 }).toUpperCase();
  const taxRate = V.num(b.tax_rate, 'VAT rate', { min: 0, max: 100 }) ?? 0;
  const off = V.int(b.utc_offset_min, 'Time zone', { min: -720, max: 840 });
  await env.DB.prepare(
    `UPDATE shp_shops SET name = ?, short_name = ?, phone = ?, email = ?, address = ?, website = ?, tax_no = ?,
       currency = ?, primary_color = COALESCE(?, primary_color), tax_rate = ?, utc_offset_min = COALESCE(?, utc_offset_min), receipt_note = ?
     WHERE id = ?`
  ).bind(name, shortName, V.phone(b.phone, 'Phone'), V.email(b.email, 'Email'), V.str(b.address, 'Address', { max: 300 }),
    V.str(b.website, 'Website', { max: 200 }), V.str(b.tax_no, 'Tax number (TIN)', { max: 40 }),
    V.str(b.currency, 'Currency', { max: 6, required: true }).toUpperCase(), V.color(b.primary_color, 'Brand colour'),
    taxRate, off, V.str(b.receipt_note, 'Receipt note', { max: 300 }), ctx.shop.id).run();
  await audit(env, request, ctx, 'settings.shop', 'shop', ctx.shop.id, 'Shop information updated');
  return json({ ok: true });
});

export const uploadLogo = secure({ perm: 'settings.manage' }, async ({ request, env, ctx }) => {
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, 'Please choose a logo image.');
  const key = await storeImage(env, form.get('logo'), `shop/${ctx.shop.id}/logo`);
  const old = ctx.shop.logo_key;
  await env.DB.prepare('UPDATE shp_shops SET logo_key = ? WHERE id = ?').bind(key, ctx.shop.id).run();
  if (old && env.MATERIALS) await env.MATERIALS.delete(old).catch(() => {});
  await audit(env, request, ctx, 'settings.logo', 'shop', ctx.shop.id, 'Logo changed');
  return json({ ok: true });
});

// Logos are public branding (shown on the sign-in page and printed receipts).
export async function publicLogo({ params, env }) {
  const s = await env.DB.prepare('SELECT logo_key FROM shp_shops WHERE id = ?').bind(params.id).first();
  if (!s || !s.logo_key) return new Response('Not found', { status: 404 });
  return imageResponse(env, s.logo_key);
}

export const saveSettings = secure({ perm: 'settings.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const sid = ctx.shop.id;
  if (b.payment_methods !== undefined) {
    if (!Array.isArray(b.payment_methods) || !b.payment_methods.length) fail(400, 'Add at least one payment method.');
    const list = [...new Set(b.payment_methods.map((m) => V.str(m, 'Payment method', { required: true, max: 40 })))];
    await saveSetting(env, sid, 'payment_methods', list);
  }
  if (b.expense_categories !== undefined) {
    if (!Array.isArray(b.expense_categories) || !b.expense_categories.length) fail(400, 'Add at least one expense category.');
    await saveSetting(env, sid, 'expense_categories', [...new Set(b.expense_categories.map((m) => V.str(m, 'Expense category', { required: true, max: 40 })))]);
  }
  if (b.loyalty_rate !== undefined) {
    await saveSetting(env, sid, 'loyalty_rate', V.num(b.loyalty_rate, 'Loyalty rate', { min: 0, max: 100000000 }) ?? 0);
  }
  if (b.allow_negative_stock !== undefined) await saveSetting(env, sid, 'allow_negative_stock', !!b.allow_negative_stock);
  for (const k of ['receipt_footer', 'receipt_prefix', 'customer_prefix']) {
    if (b[k] !== undefined) {
      const val = V.str(b[k], k, { max: 300 }) || '';
      if ((k === 'receipt_prefix' || k === 'customer_prefix') && !/^[A-Za-z0-9]{1,8}$/.test(val)) fail(400, 'Prefixes must be 1–8 letters or numbers.');
      await saveSetting(env, sid, k, k.endsWith('prefix') ? val.toUpperCase() : val);
    }
  }
  await audit(env, request, ctx, 'settings.update', 'settings', null, Object.keys(b).join(', '));
  return json({ ok: true, settings: await getSettings(env, sid) });
});

// ---------------------------------------------------------------------
// Roles & permissions
// ---------------------------------------------------------------------
export const getPermissions = secure({ perm: ['settings.manage', 'users.manage'] }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare('SELECT role, permission FROM shp_role_permissions WHERE shop_id = ?').bind(ctx.shop.id).all();
  const matrix = { owner: ALL_PERMISSION_KEYS, manager: [], cashier: [] };
  results.forEach((r) => { if (matrix[r.role]) matrix[r.role].push(r.permission); });
  return json({ catalogue: PERMISSIONS, matrix, defaults: DEFAULT_ROLE_PERMISSIONS });
});

export const savePermissions = secure({ perm: 'settings.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const role = V.oneOf(b.role, 'Role', ['manager', 'cashier'], { required: true });
  const perms = [...new Set((b.permissions || []).map(String))];
  if (perms.some((p) => !ALL_PERMISSION_KEYS.includes(p))) fail(400, 'Unknown permission in the list.');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM shp_role_permissions WHERE shop_id = ? AND role = ?').bind(ctx.shop.id, role),
    ...perms.map((p) => env.DB.prepare('INSERT INTO shp_role_permissions (shop_id, role, permission) VALUES (?, ?, ?)').bind(ctx.shop.id, role, p)),
  ]);
  await audit(env, request, ctx, 'settings.permissions', 'role', null, `${role}: ${perms.length} permissions`);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Users (staff logins that belong to this shop)
// ---------------------------------------------------------------------
export const listUsers = secure({ perm: 'users.manage' }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    `SELECT m.id, m.role, m.active, m.created_at, u.id AS user_id, u.name, u.email,
            (SELECT MAX(logged_in_at) FROM login_events le WHERE le.user_id = u.id) AS last_login
     FROM shp_members m JOIN users u ON u.id = m.user_id
     WHERE m.shop_id = ? ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END, u.name`
  ).bind(ctx.shop.id).all();
  return json({ users: results });
});

export const addUser = secure({ perm: 'users.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, 'Full name', { required: true, max: 100 });
  const email = V.email(b.email, 'Email', { required: true });
  const role = V.oneOf(b.role, 'Role', ROLES, { required: true });
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  let userId; let linked = false;
  if (existing) {
    userId = existing.id; linked = true;
    const m = await env.DB.prepare('SELECT id FROM shp_members WHERE shop_id = ? AND user_id = ?').bind(ctx.shop.id, userId).first();
    if (m) fail(409, 'This person already has a login for your shop.');
  } else {
    const { hash, salt } = await hashPassword(V.password(b.password, 'Temporary password'));
    const r = await env.DB.prepare('INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)')
      .bind(name, email, hash, salt, 'user').run();
    userId = r.meta.last_row_id;
  }
  await env.DB.prepare('INSERT INTO shp_members (shop_id, user_id, role) VALUES (?, ?, ?)').bind(ctx.shop.id, userId, role).run();
  await audit(env, request, ctx, 'user.create', 'user', userId, `${email} as ${role}`);
  return json({ ok: true, user_id: userId, linked }, { status: 201 });
});

export const updateUser = secure({ perm: 'users.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const m = await env.DB.prepare('SELECT * FROM shp_members WHERE id = ? AND shop_id = ?').bind(params.id, ctx.shop.id).first();
  if (!m) fail(404, 'User not found.');
  const role = b.role !== undefined ? V.oneOf(b.role, 'Role', ROLES, { required: true }) : m.role;
  const active = b.active === undefined ? m.active : (b.active ? 1 : 0);
  if (m.role === 'owner' && (role !== 'owner' || !active)) {
    const others = await env.DB.prepare(`SELECT COUNT(*) AS n FROM shp_members WHERE shop_id = ? AND role = 'owner' AND active = 1 AND id != ?`).bind(ctx.shop.id, m.id).first();
    if (!others.n) fail(400, 'Your shop needs at least one active owner.');
  }
  await env.DB.prepare('UPDATE shp_members SET role = ?, active = ? WHERE id = ?').bind(role, active, m.id).run();
  if (b.new_password) {
    const other = await env.DB.prepare('SELECT COUNT(*) AS n FROM shp_members WHERE user_id = ? AND shop_id != ?').bind(m.user_id, ctx.shop.id).first();
    if (other.n) fail(400, 'This person also belongs to another shop, so only they can change their password.');
    const { hash, salt } = await hashPassword(V.password(b.new_password, 'New password'));
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').bind(hash, salt, m.user_id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(m.user_id),
    ]);
  }
  await audit(env, request, ctx, 'user.update', 'user', m.user_id, `${m.role}→${role}, active=${active}${b.new_password ? ', password reset' : ''}`);
  return json({ ok: true });
});
