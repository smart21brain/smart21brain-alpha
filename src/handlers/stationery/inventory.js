import { json, badRequest, notFound } from '../../lib/auth.js';
import { getStationeryContext, requirePermission, logAudit, notify } from '../../lib/stationery-auth.js';

export async function listInventory({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const lowOnly = url.searchParams.get('low') === '1';

  const { results } = await env.DB.prepare(
    `SELECT * FROM stn_inventory_items WHERE business_id = ?
     ${lowOnly ? 'AND quantity <= reorder_level' : ''} ORDER BY category, name`
  ).bind(ctx.business.id).all();
  return json({ items: results });
}

export async function createItem({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_inventory');
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const name = String(body?.name || '').trim();
  if (!name) return badRequest('Item name is required.');

  const result = await env.DB.prepare(
    `INSERT INTO stn_inventory_items (business_id, branch_id, name, category, unit, quantity, reorder_level, cost_price, barcode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    ctx.business.id, ctx.branchId, name, body.category || 'General', body.unit || 'pcs',
    Number(body.quantity) || 0, Number(body.reorder_level) || 5, Number(body.cost_price) || 0,
    body.barcode || null
  ).run();

  await logAudit(env, ctx.business.id, ctx.user.id, 'inventory.created', name);
  return json({ id: result.meta.last_row_id }, { status: 201 });
}

export async function updateItem({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_inventory');
  if (denied) return denied;

  const item = await env.DB.prepare('SELECT id FROM stn_inventory_items WHERE id = ? AND business_id = ?')
    .bind(params.id, ctx.business.id).first();
  if (!item) return notFound();

  const body = await request.json().catch(() => null);
  if (!body) return badRequest('Invalid JSON body.');

  await env.DB.prepare(
    `UPDATE stn_inventory_items SET
      name = COALESCE(?, name), category = COALESCE(?, category), unit = COALESCE(?, unit),
      reorder_level = COALESCE(?, reorder_level), cost_price = COALESCE(?, cost_price), barcode = COALESCE(?, barcode)
     WHERE id = ?`
  ).bind(
    body.name || null, body.category || null, body.unit || null,
    body.reorder_level !== undefined ? Number(body.reorder_level) : null,
    body.cost_price !== undefined ? Number(body.cost_price) : null,
    body.barcode || null, item.id
  ).run();

  return json({ ok: true });
}

// Manual stock adjustment (purchase, waste, correction). Sale-driven
// deductions happen automatically from orders.js.
export async function adjustStock({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_inventory');
  if (denied) return denied;

  const item = await env.DB.prepare('SELECT * FROM stn_inventory_items WHERE id = ? AND business_id = ?')
    .bind(params.id, ctx.business.id).first();
  if (!item) return notFound();

  const body = await request.json().catch(() => null);
  const change = Number(body?.change_qty);
  if (!Number.isFinite(change) || change === 0) return badRequest('change_qty must be a non-zero number.');
  const reason = ['purchase', 'adjustment', 'waste'].includes(body?.reason) ? body.reason : 'adjustment';

  const newQty = item.quantity + change;
  if (newQty < 0) return badRequest('That would take stock below zero.');

  await env.DB.batch([
    env.DB.prepare('UPDATE stn_inventory_items SET quantity = ? WHERE id = ?').bind(newQty, item.id),
    env.DB.prepare(
      `INSERT INTO stn_stock_movements (business_id, item_id, change_qty, reason, created_by) VALUES (?, ?, ?, ?, ?)`
    ).bind(ctx.business.id, item.id, change, reason, ctx.user.id),
  ]);

  if (newQty <= item.reorder_level) {
    await notify(env, ctx.business.id, 'Low stock', `${item.name} is now at ${newQty} ${item.unit} (reorder level ${item.reorder_level}).`, 'warning');
  }

  return json({ ok: true, quantity: newQty });
}

export async function stockHistory({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  const { results } = await env.DB.prepare(
    `SELECT m.*, u.name AS created_by_name FROM stn_stock_movements m
     LEFT JOIN users u ON u.id = m.created_by
     WHERE m.item_id = ? AND m.business_id = ? ORDER BY m.created_at DESC LIMIT 100`
  ).bind(params.id, ctx.business.id).all();
  return json({ movements: results });
}

export async function deleteItem({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_inventory');
  if (denied) return denied;

  const item = await env.DB.prepare('SELECT id FROM stn_inventory_items WHERE id = ? AND business_id = ?')
    .bind(params.id, ctx.business.id).first();
  if (!item) return notFound();

  await env.DB.prepare('DELETE FROM stn_inventory_items WHERE id = ?').bind(item.id).run();
  return json({ ok: true });
}
