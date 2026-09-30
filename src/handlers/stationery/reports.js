import { json } from '../../lib/auth.js';
import { getStationeryContext } from '../../lib/stationery-auth.js';

const RANGE_SQL = {
  daily: "date(created_at) = date('now')",
  weekly: "date(created_at) >= date('now','-6 days')",
  monthly: "strftime('%Y-%m', created_at) = strftime('%Y-%m','now')",
};

export async function getReport({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  const range = url.searchParams.get('range');
  const dateFilter = RANGE_SQL[range] || RANGE_SQL.daily;
  const bizId = ctx.business.id;

  const income = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount),0) AS total FROM stn_payments WHERE business_id = ? AND ${dateFilter}`
  ).bind(bizId).first();

  const expenses = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount),0) AS total FROM stn_expenses WHERE business_id = ? AND ${dateFilter}`
  ).bind(bizId).first();

  const orders = await env.DB.prepare(
    `SELECT COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS value FROM stn_orders
     WHERE business_id = ? AND status != 'Cancelled' AND ${dateFilter}`
  ).bind(bizId).first();

  const { results: topServices } = await env.DB.prepare(
    `SELECT oi.description, COUNT(*) AS times_sold, SUM(oi.qty) AS total_qty, SUM(oi.total_price) AS revenue
     FROM stn_order_items oi JOIN stn_orders o ON o.id = oi.order_id
     WHERE o.business_id = ? AND o.status != 'Cancelled' AND ${dateFilter.replace(/created_at/g, 'o.created_at')}
     GROUP BY oi.description ORDER BY revenue DESC LIMIT 10`
  ).bind(bizId).all();

  const { results: byMethod } = await env.DB.prepare(
    `SELECT method, COALESCE(SUM(amount),0) AS total FROM stn_payments
     WHERE business_id = ? AND ${dateFilter} GROUP BY method`
  ).bind(bizId).all();

  const { results: byOperator } = await env.DB.prepare(
    `SELECT u.name AS operator_name, COUNT(*) AS orders_handled, COALESCE(SUM(o.total_amount),0) AS revenue
     FROM stn_orders o LEFT JOIN users u ON u.id = o.operator_id
     WHERE o.business_id = ? AND o.status != 'Cancelled' AND ${dateFilter}
     GROUP BY o.operator_id ORDER BY revenue DESC`
  ).bind(bizId).all();

  return json({
    range: range || 'daily',
    income: income.total,
    expenses: expenses.total,
    profit: income.total - expenses.total,
    orders_count: orders.count,
    orders_value: orders.value,
    top_services: topServices,
    by_method: byMethod,
    by_operator: byOperator,
  });
}
