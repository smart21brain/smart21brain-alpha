import { json, badRequest } from '../lib/auth.js';

// Default text-generation model for the Study Buddy assistant. Override with
// the AI_MODEL var in wrangler.toml if you want a different one.
//
// NOTE: @cf/meta/llama-3.1-8b-instruct was deprecated by Cloudflare on
// 2026-05-30 and calling it now fails -- that's why the assistant stopped
// responding. @cf/meta/llama-3.3-70b-instruct-fp8-fast is Cloudflare's
// current pinned general-purpose model (see
// https://developers.cloudflare.com/workers-ai/models/). If you'd rather
// keep an 8B-class model for speed/cost, @cf/meta/llama-3.1-8b-instruct-fast
// is the still-active replacement for the retired one.
const DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export async function ask({ request, env }) {
  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt || prompt.length > 1000) return badRequest('A question up to 1,000 characters is required.');
  if (!env.AI || typeof env.AI.run !== 'function') return json({ error: 'AI service is not configured.' }, { status: 503 });

  try {
    const result = await env.AI.run(env.AI_MODEL || DEFAULT_MODEL, {
      messages: [
        { role: 'system', content: 'You are Smart21Brain Study Buddy. Give concise, age-appropriate educational help. Do not claim to replace a teacher.' },
        { role: 'user', content: prompt },
      ],
    });
    return json({ answer: result.response || 'I could not generate an answer right now.' });
  } catch (err) {
    // Model retirements, rate limits, or transient Workers AI errors all land
    // here -- surface a clean message instead of a raw 500 with a stack trace.
    return json({ error: 'The assistant is temporarily unavailable. Please try again in a moment.' }, { status: 502 });
  }
}
