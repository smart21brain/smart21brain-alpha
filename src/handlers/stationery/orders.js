import { json, badRequest, notFound } from '../../lib/auth.js';
import { getStationeryContext, requirePermission, logAudit, notify, nextOrderNo } from '../../lib/stationery-auth.js';

const STATUSES = ['Received', 'Processing', 'Ready', 'Completed', 'Cancelled'];
const METHODS = ['mpesa', 'tigopesa', 'cash', 'bank', 'credit'];

export async function listOrders({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  const status = url.searchParams.get('status');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const q = (url.searchParams.get('q') || '').trim();

  const clauses = ['o.business_id = ?'];
  const binds = [ctx.business.id];
  if (status && STATUSES.includes(status)) { clauses.push('o.status = ?'); binds.push(status); }
  if (from) { clauses.push('date(o.created_at) >= date(?)'); binds.push(from); }
  if (to) { clauses.push('date(o.created_at) <= date(?)'); binds.push(to); }
  if (q) { clauses.push('(o.order_no LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)'); binds.push(`%${q}%`, `%${q}%`, `%${q}%`); }

  const { results } = await env.DB.prepare(
    `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone, u.name AS operator_name
     FROM stn_orders o
     LEFT JOIN stn_customers c ON c.id = o.customer_id
     LEFT JOIN users u ON u.id = o.operator_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY o.created_at DESC LIMIT 200`
  ).bind(...binds).all();

  return json({ orders: results });
}

export async function getOrder({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  const order = await env.DB.prepare(
    `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
     FROM stn_orders o LEFT JOIN stn_customers c ON c.id = o.customer_id
     WHERE o.id = ? AND o.business_id = ?`
  ).bind(params.id, ctx.business.id).first();
  if (!order) return notFound();

  const { results: items } = await env.DB.prepare(
    'SELECT * FROM stn_order_items WHERE order_id = ?'
  ).bind(order.id).all();
  const { results: payments } = await env.DB.prepare(
    'SELECT * FROM stn_payments WHERE order_id = ? ORDER BY created_at ASC'
  ).bind(order.id).all();

  return json({ order, items, payments, business: ctx.business });
}

// Create an order: Customer -> Service/Product -> File/Qty/Price/Operator
// -> Status(Received) -> Inventory deduction -> Finance.
export async function createOrder({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_orders');
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length) return badRequest('At least one order item is required.');

  let customerId = body.customer_id || null;
  if (!customerId && body.customer_name) {
    const created = await env.DB.prepare(
      'INSERT INTO stn_customers (business_id, name, phone) VALUES (?, ?, ?)'
    ).bind(ctx.business.id, body.customer_name.trim(), body.customer_phone || null).run();
    customerId = created.meta.last_row_id;
  }

  // Resolve items against the live services table (never trust client-sent prices).
  const resolvedItems = [];
  let subtotal = 0;
  for (const raw of items) {
    const qty = Number(raw.qty) || 1;
    let unitPrice = Number(raw.unit_price) || 0;
    let description = raw.description || 'Item';
    let serviceId = raw.service_id || null;
    let inventoryItemId = null;
    let deductQty = 0;

    if (serviceId) {
      const service = await env.DB.prepare('SELECT * FROM stn_services WHERE id = ? AND business_id = ?')
        .bind(serviceId, ctx.business.id).first();
      if (!service) return badRequest(`Service #${serviceId} not found.`);
      unitPrice = service.unit_price;
      description = raw.description || service.name;
      inventoryItemId = service.inventory_item_id;
      deductQty = service.deduct_qty;
    }

    const totalPrice = qty * unitPrice;
    subtotal += totalPrice;
    resolvedItems.push({ serviceId, description, qty, unitPrice, totalPrice, fileKey: raw.file_key || null, inventoryItemId, deductQty });
  }

  const discount = Number(body.discount) || 0;
  const total = Math.max(0, subtotal - discount);
  const orderNo = await nextOrderNo(env, ctx.business.id);

  const orderResult = await env.DB.prepare(
    `INSERT INTO stn_orders (business_id, branch_id, order_no, customer_id, operator_id, status, subtotal, discount, total_amount, notes, created_by)
     VALUES (?, ?, ?, ?, ?, 'Received', ?, ?, ?, ?, ?)`
  ).bind(
    ctx.business.id, ctx.branchId, orderNo, customerId, body.operator_id || ctx.user.id,
    subtotal, discount, total, body.notes || null, ctx.user.id
  ).run();
  const orderId = orderResult.meta.last_row_id;

  for (const it of resolvedItems) {
    await env.DB.prepare(
      `INSERT INTO stn_order_items (order_id, service_id, description, qty, unit_price, total_price, file_key)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(orderId, it.serviceId, it.description, it.qty, it.unitPrice, it.totalPrice, it.fileKey).run();

    // Automatic inventory deduction, if this service is linked to stock.
    if (it.inventoryItemId && it.deductQty) {
      const amountToDeduct = it.qty * it.deductQty;
      const invItem = await env.DB.prepare('SELECT * FROM stn_inventory_items WHERE id = ?').bind(it.inventoryItemId).first();
      if (invItem) {
        const newQty = Math.max(0, invItem.quantity - amountToDeduct);
        await env.DB.prepare('UPDATE stn_inventory_items SET quantity = ? WHERE id = ?').bind(newQty, invItem.id).run();
        await env.DB.prepare(
          `INSERT INTO stn_stock_movements (business_id, item_id, change_qty, reason, ref_order_id, created_by)
           VALUES (?, ?, ?, 'sale', ?, ?)`
        ).bind(ctx.business.id, invItem.id, -amountToDeduct, orderId, ctx.user.id).run();
        if (newQty <= invItem.reorder_level) {
          await notify(env, ctx.business.id, 'Low stock', `${invItem.name} is now at ${newQty} ${invItem.unit}.`, 'warning');
        }
      }
    }
  }

  // Immediate full/partial payment at checkout, if provided.
  if (body.payment && Number(body.payment.amount) > 0) {
    await recordPaymentInternal(env, ctx, orderId, Number(body.payment.amount), body.payment.method, body.payment.reference);
  }

  await logAudit(env, ctx.business.id, ctx.user.id, 'order.created', orderNo);
  return json({ id: orderId, order_no: orderNo, total_amount: total }, { status: 201 });
}

export async function updateOrderStatus({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_orders');
  if (denied) return denied;

  const order = await env.DB.prepare('SELECT * FROM stn_orders WHERE id = ? AND business_id = ?')
    .bind(params.id, ctx.business.id).first();
  if (!order) return notFound();

  const body = await request.json().catch(() => null);
  const status = body?.status;
  if (!STATUSES.includes(status)) return badRequest(`status must be one of: ${STATUSES.join(', ')}`);

  await env.DB.prepare(
    `UPDATE stn_orders SET status = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(status, order.id).run();

  await logAudit(env, ctx.business.id, ctx.user.id, 'order.status', `${order.order_no} -> ${status}`);
  return json({ ok: true });
}

async function recordPaymentInternal(env, ctx, orderId, amount, method, reference) {
  await env.DB.prepare(
    `INSERT INTO stn_payments (business_id, order_id, amount, method, reference, received_by) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(ctx.business.id, orderId, amount, METHODS.includes(method) ? method : 'cash', reference || null, ctx.user.id).run();

  const order = await env.DB.prepare('SELECT total_amount, paid_amount FROM stn_orders WHERE id = ?').bind(orderId).first();
  const newPaid = order.paid_amount + amount;
  const paymentStatus = newPaid >= order.total_amount ? 'Paid' : (newPaid > 0 ? 'Partial' : 'Unpaid');

  await env.DB.prepare(
    `UPDATE stn_orders SET paid_amount = ?, payment_status = ?, payment_method = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(newPaid, paymentStatus, method || 'cash', orderId).run();

  return { newPaid, paymentStatus };
}

export async function addPayment({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_orders');
  if (denied) return denied;

  const order = await env.DB.prepare('SELECT * FROM stn_orders WHERE id = ? AND business_id = ?')
    .bind(params.id, ctx.business.id).first();
  if (!order) return notFound();

  const body = await request.json().catch(() => null);
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return badRequest('A positive amount is required.');

  const result = await recordPaymentInternal(env, ctx, order.id, amount, body.method, body.reference);
  await logAudit(env, ctx.business.id, ctx.user.id, 'payment.recorded', `${order.order_no}: ${amount}`);
  return json({ ok: true, ...result }, { status: 201 });
}

// Printable receipt payload — the frontend renders this to a print view / PDF.
export async function getReceipt({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  const order = await env.DB.prepare(
    `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone
     FROM stn_orders o LEFT JOIN stn_customers c ON c.id = o.customer_id
     WHERE o.id = ? AND o.business_id = ?`
  ).bind(params.id, ctx.business.id).first();
  if (!order) return notFound();

  const { results: items } = await env.DB.prepare('SELECT * FROM stn_order_items WHERE order_id = ?').bind(order.id).all();
  const { results: payments } = await env.DB.prepare('SELECT * FROM stn_payments WHERE order_id = ?').bind(order.id).all();

  return json({ order, items, payments, business: ctx.business });
}
