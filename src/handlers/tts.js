import { json, badRequest } from '../lib/auth.js';

// Smart21Brain AI -- natural voice for Voice chat and Read aloud.
//
// POST /api/ai-tts   { text: "One sentence or two.", lang: "en", voice?: "thalia" }
//   -> audio/mpeg
//
// Uses Deepgram Aura through Workers AI (context-aware pacing and natural fillers):
//   1. @cf/deepgram/aura-2-en   (best, English)
//   2. @cf/deepgram/aura-1      (fallback, English)
// Override with the vars TTS_MODEL (first choice) and TTS_VOICE (speaker name).
// Kiswahili has no neural voice on Workers AI yet: for lang "sw" this returns 501 and the
// page falls back to the browser voice automatically.

const PRIMARY = '@cf/deepgram/aura-2-en';
const FALLBACK = '@cf/deepgram/aura-1';
const DEFAULT_VOICE = { '@cf/deepgram/aura-2-en': 'thalia', '@cf/deepgram/aura-1': 'luna' };
const MAX_TEXT = 700;   // one or two sentences per call; the page sends sentence by sentence

async function sha1(str) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Workers AI can answer with a raw Response, a stream, bytes or {audio: base64}; accept all of them.
async function toAudioBody(result) {
  if (!result) return null;
  if (result instanceof Response) return result.ok ? result.body : null;
  if (typeof result.getReader === 'function') return result;
  if (result instanceof ArrayBuffer || ArrayBuffer.isView(result)) return result;
  if (typeof result.audio === 'string') {
    const bin = atob(result.audio);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return null;
}

export async function speak({ request, env, ctx }) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text.replace(/\s+/g, ' ').trim() : '';
  const lang = body?.lang === 'sw' ? 'sw' : 'en';
  if (!text || text.length > MAX_TEXT) return badRequest('Text up to ' + MAX_TEXT + ' characters is required.');
  if (lang === 'sw') return json({ error: 'No neural voice for this language yet.', code: 'lang_unsupported' }, { status: 501 });
  if (!env.AI || typeof env.AI.run !== 'function') return json({ error: 'Voice service is not configured.' }, { status: 503 });

  const models = [env.TTS_MODEL || PRIMARY, FALLBACK].filter((m, i, a) => a.indexOf(m) === i);
  const wanted = typeof body?.voice === 'string' ? body.voice.replace(/[^a-z]/gi, '').toLowerCase().slice(0, 20) : '';

  // identical sentences ("Good question.", "Let's try one more.") are served from the edge cache
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = 'https://tts.cache.local/' + (await sha1(models[0] + '|' + (wanted || env.TTS_VOICE || '') + '|' + text));
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }

  for (const model of models) {
    try {
      const speaker = wanted || env.TTS_VOICE || DEFAULT_VOICE[model] || 'luna';
      const out = await env.AI.run(model, { text, speaker, encoding: 'mp3' }, { returnRawResponse: true });
      const audio = await toAudioBody(out);
      if (!audio) continue;
      const res = new Response(audio, {
        headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' },
      });
      if (cache && ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(cache.put(key, res.clone()));
      return res;
    } catch (err) {
      // model unavailable / rate limited: try the next one
    }
  }
  return json({ error: 'Voice is temporarily unavailable.', code: 'tts_unavailable' }, { status: 502 });
}
