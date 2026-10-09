import { json, badRequest } from '../../lib/auth.js';
import { getStationeryContext, requirePermission, logAudit } from '../../lib/stationery-auth.js';

export async function listNotifications({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const unreadOnly = url.searchParams.get('unread') === '1';

  const { results } = await env.DB.prepare(
    `SELECT * FROM stn_notifications WHERE business_id = ? ${unreadOnly ? 'AND is_read = 0' : ''} ORDER BY created_at DESC LIMIT 50`
  ).bind(ctx.business.id).all();
  return json({ notifications: results });
}

export async function markRead({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  await env.DB.prepare('UPDATE stn_notifications SET is_read = 1 WHERE id = ? AND business_id = ?')
    .bind(params.id, ctx.business.id).run();
  return json({ ok: true });
}

export async function markAllRead({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  await env.DB.prepare('UPDATE stn_notifications SET is_read = 1 WHERE business_id = ?').bind(ctx.business.id).run();
  return json({ ok: true });
}

export async function listAuditLog({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_backup');
  if (denied) return denied;

  const { results } = await env.DB.prepare(
    `SELECT a.*, u.name AS user_name FROM stn_audit_log a LEFT JOIN users u ON u.id = a.user_id
     WHERE a.business_id = ? ORDER BY a.created_at DESC LIMIT 300`
  ).bind(ctx.business.id).all();
  return json({ log: results });
}

// Full JSON export of this business's data. The browser encrypts this
// client-side (Web Crypto AES-GCM with the owner's passphrase) before it
// ever touches disk — see js/stationery/security.js. D1 itself is also
// encrypted at rest and backed up by Cloudflare; this export is for the
// shop's own offline copy.
export async function exportBackup({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_backup');
  if (denied) return denied;

  const bizId = ctx.business.id;
  const tables = [
    'stn_customers', 'stn_services', 'stn_inventory_items', 'stn_orders',
    'stn_order_items', 'stn_payments', 'stn_expenses', 'stn_online_services',
  ];
  const data = { business: ctx.business, exported_at: new Date().toISOString() };

  for (const table of tables) {
    if (table === 'stn_order_items') {
      const { results } = await env.DB.prepare(
        `SELECT oi.* FROM stn_order_items oi JOIN stn_orders o ON o.id = oi.order_id WHERE o.business_id = ?`
      ).bind(bizId).all();
      data[table] = results;
    } else {
      const { results } = await env.DB.prepare(`SELECT * FROM ${table} WHERE business_id = ?`).bind(bizId).all();
      data[table] = results;
    }
  }

  await logAudit(env, bizId, ctx.user.id, 'backup.exported', `${tables.length} tables`);
  return json(data);
}

// Restore is intentionally narrow: it only re-imports customers, services
// and inventory (safe, non-transactional data) to avoid corrupting
// financial history. Orders/payments are never overwritten by an import.
export async function restoreBackup({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_backup');
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return badRequest('A decrypted backup JSON body is required.');

  let restoredCustomers = 0, restoredServices = 0, restoredInventory = 0;

  for (const c of body.stn_customers || []) {
    await env.DB.prepare('INSERT INTO stn_customers (business_id, name, phone, email, notes) VALUES (?, ?, ?, ?, ?)')
      .bind(ctx.business.id, c.name, c.phone || null, c.email || null, c.notes || null).run();
    restoredCustomers++;
  }
  for (const s of body.stn_services || []) {
    await env.DB.prepare('INSERT INTO stn_services (business_id, name, category, unit, unit_price, cost_price) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(ctx.business.id, s.name, s.category, s.unit, s.unit_price, s.cost_price || 0).run();
    restoredServices++;
  }
  for (const i of body.stn_inventory_items || []) {
    await env.DB.prepare('INSERT INTO stn_inventory_items (business_id, branch_id, name, category, unit, quantity, reorder_level, cost_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(ctx.business.id, ctx.branchId, i.name, i.category, i.unit, i.quantity || 0, i.reorder_level || 5, i.cost_price || 0).run();
    restoredInventory++;
  }

  await logAudit(env, ctx.business.id, ctx.user.id, 'backup.restored', `${restoredCustomers} customers, ${restoredServices} services, ${restoredInventory} inventory items`);
  return json({ ok: true, restoredCustomers, restoredServices, restoredInventory });
}
