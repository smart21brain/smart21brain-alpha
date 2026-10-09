import { json, badRequest } from '../../lib/auth.js';
import { getStationeryContext } from '../../lib/stationery-auth.js';

const SYSTEM_BASE = `You are Smart21brain AI, the in-app assistant for a Tanzanian/East-African stationery, printing and photo-studio shop running on smart21brain Stationery OS. Be concise, practical and friendly. Reply in the same language the operator writes in (English or Kiswahili). Never claim to submit anything to a government system — you only guide the operator through paperwork.`;

// See src/handlers/assistant.js for why this isn't llama-3.1-8b-instruct
// anymore (Cloudflare retired it on 2026-05-30).
const DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

async function runModel(env, systemPrompt, userPrompt) {
  if (!env.AI || typeof env.AI.run !== 'function') {
    return 'AI service is not configured for this deployment yet — ask an admin to enable the Workers AI binding.';
  }
  try {
    const result = await env.AI.run(env.AI_MODEL || DEFAULT_MODEL, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });
    return result?.response?.trim() || 'I could not generate a useful answer just now — please try rephrasing.';
  } catch (err) {
    return 'The assistant is temporarily unavailable — please try again in a moment.';
  }
}

export async function ask({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  const body = await request.json().catch(() => null);
  const mode = body?.mode || 'general';
  const prompt = String(body?.prompt || '').trim();
  if (!prompt || prompt.length > 1500) return badRequest('A question up to 1,500 characters is required.');

  let systemPrompt = SYSTEM_BASE;

  if (mode === 'machine' && body.machine_id) {
    const machine = await env.DB.prepare(
      'SELECT * FROM stn_machines WHERE id = ? AND (business_id IS NULL OR business_id = ?)'
    ).bind(body.machine_id, ctx.business.id).first();
    if (machine) {
      systemPrompt += `\nThe operator is troubleshooting this machine: ${machine.name} (${machine.category}). Reference manual: ${machine.content}. Give a short step-by-step fix, and mention safety warnings if relevant.`;
    }
  }

  if (mode === 'photo') {
    const { results: presets } = await env.DB.prepare(
      'SELECT country, name, width_mm, height_mm, dpi, face_min_pct, face_max_pct FROM stn_photo_presets WHERE business_id IS NULL OR business_id = ?'
    ).bind(ctx.business.id).all();
    systemPrompt += `\nHelp the operator take a compliant passport/ID photo. Available print presets: ${JSON.stringify(presets)}. Give clear, ordered steps (pose, lighting, background, cropping) for the country they mention.`;
  }

  if (mode === 'business') {
    const stats = await env.DB.prepare(
      `SELECT
        (SELECT COALESCE(SUM(amount),0) FROM stn_payments WHERE business_id = ? AND date(created_at) = date('now')) AS sales_today,
        (SELECT COALESCE(SUM(amount),0) FROM stn_expenses WHERE business_id = ? AND date(created_at) = date('now')) AS expenses_today,
        (SELECT COUNT(*) FROM stn_orders WHERE business_id = ? AND date(created_at) = date('now')) AS orders_today,
        (SELECT COUNT(*) FROM stn_inventory_items WHERE business_id = ? AND quantity <= reorder_level) AS low_stock`
    ).bind(ctx.business.id, ctx.business.id, ctx.business.id, ctx.business.id).first();
    systemPrompt += `\nToday's real numbers for this shop: ${JSON.stringify(stats)} (currency ${ctx.business.currency}). Ground your business advice in these numbers.`;
  }

  if (mode === 'sales_summary') {
    const week = await env.DB.prepare(
      `SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count FROM stn_payments WHERE business_id = ? AND date(created_at) >= date('now','-6 days')`
    ).bind(ctx.business.id).first();
    const { results: topServices } = await env.DB.prepare(
      `SELECT oi.description, SUM(oi.total_price) AS revenue FROM stn_order_items oi JOIN stn_orders o ON o.id = oi.order_id
       WHERE o.business_id = ? AND date(o.created_at) >= date('now','-6 days') GROUP BY oi.description ORDER BY revenue DESC LIMIT 5`
    ).bind(ctx.business.id).all();
    systemPrompt += `\nLast 7 days: ${JSON.stringify(week)} ${ctx.business.currency}, top services: ${JSON.stringify(topServices)}. Write a short sales summary the owner can read in 10 seconds.`;
  }

  const answer = await runModel(env, systemPrompt, prompt);
  return json({ answer, mode });
}
