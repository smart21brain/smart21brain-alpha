import { json } from '../../lib/auth.js';
import { getStationeryContext } from '../../lib/stationery-auth.js';

export async function getDashboard({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const bizId = ctx.business.id;

  const today = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount),0) AS sales FROM stn_payments WHERE business_id = ? AND date(created_at) = date('now')`
  ).bind(bizId).first();

  const ordersToday = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM stn_orders WHERE business_id = ? AND date(created_at) = date('now') AND status != 'Cancelled'`
  ).bind(bizId).first();

  const expensesToday = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount),0) AS total FROM stn_expenses WHERE business_id = ? AND date(created_at) = date('now')`
  ).bind(bizId).first();

  const lowStock = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM stn_inventory_items WHERE business_id = ? AND quantity <= reorder_level`
  ).bind(bizId).first();

  const { results: last7 } = await env.DB.prepare(
    `SELECT date(created_at) AS day, COALESCE(SUM(amount),0) AS total
     FROM stn_payments WHERE business_id = ? AND date(created_at) >= date('now','-6 days')
     GROUP BY day ORDER BY day ASC`
  ).bind(bizId).all();

  // Fill in missing days with 0 so the chart is continuous.
  const salesGraph = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const found = last7.find((r) => r.day === day);
    salesGraph.push({ day, total: found ? found.total : 0 });
  }

  const { results: recentOrders } = await env.DB.prepare(
    `SELECT o.id, o.order_no, o.status, o.payment_status, o.total_amount, c.name AS customer_name, o.created_at
     FROM stn_orders o LEFT JOIN stn_customers c ON c.id = o.customer_id
     WHERE o.business_id = ? ORDER BY o.created_at DESC LIMIT 8`
  ).bind(bizId).all();

  const { results: lowStockItems } = await env.DB.prepare(
    `SELECT name, quantity, unit, reorder_level FROM stn_inventory_items WHERE business_id = ? AND quantity <= reorder_level LIMIT 5`
  ).bind(bizId).all();

  const stats = {
    sales_today: today.sales,
    orders_today: ordersToday.count,
    expenses_today: expensesToday.total,
    profit_today: today.sales - expensesToday.total,
    low_stock_count: lowStock.count,
    currency: ctx.business.currency,
    sales_graph: salesGraph,
    recent_orders: recentOrders,
    low_stock_items: lowStockItems,
  };

  stats.ai_insight = await buildInsight(env, stats);
  return json(stats);
}

async function buildInsight(env, stats) {
  const fallback = stats.low_stock_count > 0
    ? `Heads up: ${stats.low_stock_count} item(s) are low on stock — restock soon to avoid turning away jobs.`
    : (stats.sales_today > 0
        ? `Good pace today — ${stats.orders_today} order(s) and ${stats.sales_today.toLocaleString()} ${stats.currency} collected so far.`
        : `No sales recorded yet today — keep the counter staffed and check pending orders.`);

  if (!env.AI || typeof env.AI.run !== 'function') return fallback;
  try {
    const prompt = `Business snapshot for today: sales=${stats.sales_today} ${stats.currency}, orders=${stats.orders_today}, expenses=${stats.expenses_today} ${stats.currency}, low-stock items=${stats.low_stock_count}. In one short, friendly sentence, give the shop owner a useful business insight or tip based on these numbers. No greeting, no markdown.`;
    const result = await env.AI.run(env.AI_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: 'You are Smart21brain AI, a concise business assistant for a stationery/printing shop.' },
        { role: 'user', content: prompt },
      ],
    });
    return (result?.response || '').trim() || fallback;
  } catch (e) {
    return fallback;
  }
}
