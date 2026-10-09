import { json, badRequest } from '../lib/auth.js';

// Smart21Brain AI -- image generation (text -> picture) on Cloudflare Workers AI.
//
// POST /api/ai-image   { prompt: "a red kite over a beach", style?: "cartoon", ratio?: "square"|"wide"|"tall", enhance?: true }
//   -> 200 { image: "data:image/...;base64,...", prompt: "<the prompt actually used>", model: "..." }
//   -> 400 bad input | 422 { code: "blocked" } not allowed for a learning site | 502 { code: "unavailable" }
//
// Models (override the first choice with the IMAGE_MODEL var):
//   square  : @cf/black-forest-labs/flux-1-schnell  (best quality, fast)  -> SDXL Lightning fallback
//   wide/tall: @cf/bytedance/stable-diffusion-xl-lightning (supports width/height) -> FLUX (square) fallback
//
// The user's words are first turned into one clear English picture prompt by the chat model. That also
// makes Kiswahili requests work, and lets the model refuse anything unsuitable for a school site.

const FLUX = '@cf/black-forest-labs/flux-1-schnell';
const SDXL = '@cf/bytedance/stable-diffusion-xl-lightning';
const TEXT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MAX_PROMPT = 600;

const SIZES = { square: [1024, 1024], wide: [1024, 576], tall: [576, 1024] };

const STYLES = {
  realistic: 'photorealistic, natural lighting, sharp focus, high detail',
  cartoon: 'colourful cartoon illustration, bold clean outlines, friendly, kid-friendly',
  anime: 'anime style illustration, vibrant colours, clean line art',
  '3d': '3D render, soft studio lighting, smooth materials, Pixar-like look',
  watercolor: 'soft watercolour painting, paper texture, gentle colour washes',
  pixel: 'pixel art, 16-bit retro game style, limited colour palette',
  sketch: 'pencil sketch, hand-drawn, black and white shading',
  flat: 'flat vector illustration, simple shapes, modern clean colours',
  digital: 'digital painting, rich colours, dramatic lighting, detailed concept art',
  logo: 'minimal logo design, simple vector shapes, centred on a plain background',
};

// Cheap first filter before any model is called. The model prompt below is the second, smarter filter.
const BLOCKED = /\b(nude|naked|nsfw|porn\w*|erotic|genitals?|gore|gory|beheading|dismember\w*|rape|ngono|uchi)\b/i;

const ENHANCE_SYSTEM = [
  'You write prompts for a text-to-image model used on a children\'s and teenagers\' learning website.',
  'Turn the user\'s request (any language, including Kiswahili) into ONE vivid English image prompt of at most 60 words: subject, setting, colours, mood, composition. Keep what the user asked for; add only helpful visual detail.',
  'Do not put quoted text or lettering in the picture unless the user clearly asked for specific words.',
  'If the request asks for anything sexual, nude, gory, violent, hateful, self-harm, weapons-making, drugs, or a realistic picture of a real, named person (celebrity, politician, classmate), reply with exactly: REFUSE',
  'Output ONLY the prompt (or REFUSE). No quotes, no explanation.',
].join('\n');

function cleanText(v, n) { return typeof v === 'string' ? v.replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) : ''; }

async function improve(env, userPrompt) {
  try {
    const res = await env.AI.run(env.AI_MODEL || TEXT_MODEL, {
      messages: [{ role: 'system', content: ENHANCE_SYSTEM }, { role: 'user', content: userPrompt }],
      max_tokens: 160,
      temperature: 0.5,
    });
    const text = typeof res === 'string' ? res : (res && (res.response || res.result || ''));
    const out = typeof text === 'string' ? text.trim().replace(/^["'`]+|["'`]+$/g, '') : '';
    return out || null;
  } catch (e) {
    return null; // fall back to the raw prompt
  }
}

function toBase64(bytes) {
  let bin = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  return btoa(bin);
}

function mimeOf(b) {
  if (b[0] === 0x89 && b[1] === 0x50) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b[0] === 0x52 && b[1] === 0x49) return 'image/webp';
  return '';
}

async function readAll(stream) {
  const chunks = [];
  const reader = stream.getReader();
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

// Workers AI image models answer in different shapes: {image: base64}, a byte stream, bytes, or a Response.
async function toDataUrl(result) {
  if (!result) return null;
  let bytes = null;
  if (typeof result === 'string') return /^data:image\//.test(result) ? result : 'data:image/png;base64,' + result;
  if (typeof result.image === 'string') {
    const b64 = result.image.replace(/^data:image\/\w+;base64,/, '');
    const head = Uint8Array.from(atob(b64.slice(0, 16)), (c) => c.charCodeAt(0));
    return 'data:' + (mimeOf(head) || 'image/jpeg') + ';base64,' + b64;
  }
  if (result instanceof Response) bytes = new Uint8Array(await result.arrayBuffer());
  else if (typeof result.getReader === 'function') bytes = await readAll(result);
  else if (result instanceof ArrayBuffer) bytes = new Uint8Array(result);
  else if (ArrayBuffer.isView(result)) bytes = new Uint8Array(result.buffer, result.byteOffset, result.byteLength);
  if (!bytes || bytes.length < 200) return null;
  return 'data:' + (mimeOf(bytes) || 'image/png') + ';base64,' + toBase64(bytes);
}

function plan(env, ratio) {
  const first = env.IMAGE_MODEL;
  const list = ratio === 'square' ? [first, FLUX, SDXL] : [first, SDXL, FLUX];
  return list.filter((m, i, a) => m && a.indexOf(m) === i);
}

function inputFor(model, prompt, ratio) {
  if (model.indexOf('flux') >= 0) return { prompt, steps: 6 };
  const [width, height] = SIZES[ratio];
  return { prompt, width, height, num_steps: 8 };
}

export async function generate({ request, env }) {
  const body = await request.json().catch(() => null);
  const raw = cleanText(body?.prompt, MAX_PROMPT);
  if (raw.length < 3) return badRequest('Describe the picture you want (at least a few words).');
  const style = Object.prototype.hasOwnProperty.call(STYLES, body?.style) ? body.style : '';
  const ratio = Object.prototype.hasOwnProperty.call(SIZES, body?.ratio) ? body.ratio : 'square';
  if (!env.AI || typeof env.AI.run !== 'function') return json({ error: 'Image service is not configured.', code: 'unavailable' }, { status: 503 });
  if (BLOCKED.test(raw)) return json({ error: 'I can only make pictures that are suitable for learners. Try a different idea!', code: 'blocked' }, { status: 422 });

  let prompt = raw;
  if (body?.enhance !== false) {
    const better = await improve(env, raw);
    if (better && /^REFUSE\b/i.test(better)) return json({ error: 'I can only make pictures that are suitable for learners. Try a different idea!', code: 'blocked' }, { status: 422 });
    if (better) prompt = better;
  }
  if (BLOCKED.test(prompt)) return json({ error: 'I can only make pictures that are suitable for learners. Try a different idea!', code: 'blocked' }, { status: 422 });
  const final = (prompt + (style ? ', ' + STYLES[style] : '') + ', safe for children, no text or watermark').slice(0, 1800);

  for (const model of plan(env, ratio)) {
    try {
      const out = await env.AI.run(model, inputFor(model, final, ratio));
      const image = await toDataUrl(out);
      if (image) return json({ image, prompt, model, ratio: model.indexOf('flux') >= 0 ? 'square' : ratio });
    } catch (err) {
      // model unavailable / rate limited / rejected the prompt: try the next one
    }
  }
  return json({ error: 'Picture making is busy right now. Please try again in a moment.', code: 'unavailable' }, { status: 502 });
}
