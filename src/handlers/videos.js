import { getSessionUser, json, badRequest, unauthorized, forbidden, notFound } from '../lib/auth.js';

// Workers/Pages Functions enforce a request-body ceiling (100MB on most plans).
// Bigger files should go through the "External URL" path (host on YouTube/Vimeo/
// a CDN) instead of a direct upload.
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];

// Where a video can be shown on the site. An admin picks one or more of
// these when posting a video; it then appears in that page's grid.
const ALLOWED_PLACEMENTS = ['videohub', 'cartoons', 'courses', 'kids'];

function normalizePlacements(input) {
  const list = Array.isArray(input) ? input : String(input || '').split(',');
  const clean = [...new Set(list.map((p) => String(p).trim().toLowerCase()).filter((p) => ALLOWED_PLACEMENTS.includes(p)))];
  if (!clean.length) clean.push('videohub');
  return `,${clean.join(',')},`; // comma-padded so LIKE '%,tag,%' matches whole tags only
}

function withSrc(v) {
  return {
    ...v,
    src: v.source_type === 'url' ? v.external_url : `/api/videos/${v.id}/stream`,
    placements: (v.placements || ',videohub,').split(',').filter(Boolean),
  };
}

export async function listVideos({ url, env }) {
  const placement = url.searchParams.get('placement');
  let query = `SELECT id, title, subject, description, source_type, external_url, thumbnail_url,
                      duration_seconds, placements, created_at
               FROM videos WHERE published = 1`;
  const binds = [];
  if (placement && ALLOWED_PLACEMENTS.includes(placement)) {
    query += ' AND placements LIKE ?';
    binds.push(`%,${placement},%`);
  }
  query += ' ORDER BY created_at DESC';

  const { results } = await env.DB.prepare(query).bind(...binds).all();
  return json({ videos: results.map(withSrc) });
}

export async function getVideo({ params, env }) {
  const video = await env.DB.prepare('SELECT * FROM videos WHERE id = ?').bind(params.id).first();
  if (!video) return notFound();
  return json({ video: withSrc(video) });
}

// Admin only. Two ways to call this:
//  - multipart/form-data with a "file" field  -> uploads the file to R2 (source_type = 'file')
//  - application/json with an "external_url"  -> stores a link/embed (source_type = 'url')
export async function createVideo({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  const contentType = request.headers.get('Content-Type') || '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    const title = form?.get('title');
    if (!form || !file || typeof file === 'string' || !title) {
      return badRequest('title and file are required (multipart/form-data).');
    }
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return badRequest('Only MP4, WebM or OGG video files are allowed.');
    }
    if (file.size > MAX_VIDEO_BYTES) {
      return badRequest('File is too large (100MB max) — use "External URL" for bigger files.');
    }

    const key = `videos/${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
    await env.MATERIALS.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });

    const result = await env.DB.prepare(
      `INSERT INTO videos (title, subject, description, source_type, file_key, thumbnail_url, placements, published, created_by)
       VALUES (?, ?, ?, 'file', ?, ?, ?, ?, ?)`
    ).bind(
      title,
      form.get('subject') || null,
      form.get('description') || null,
      key,
      form.get('thumbnail_url') || null,
      normalizePlacements(form.getAll('placements')),
      form.get('published') === 'false' ? 0 : 1,
      user.id
    ).run();

    return json({ id: result.meta.last_row_id }, { status: 201 });
  }

  // Otherwise: JSON body describing an externally-hosted video.
  const body = await request.json().catch(() => null);
  if (!body || !body.title || !body.external_url) {
    return badRequest('title and external_url are required.');
  }
  try {
    new URL(body.external_url);
  } catch {
    return badRequest('external_url must be a valid URL.');
  }

  const result = await env.DB.prepare(
    `INSERT INTO videos (title, subject, description, source_type, external_url, thumbnail_url, placements, published, created_by)
     VALUES (?, ?, ?, 'url', ?, ?, ?, ?, ?)`
  ).bind(
    body.title,
    body.subject || null,
    body.description || null,
    body.external_url,
    body.thumbnail_url || null,
    normalizePlacements(body.placements),
    body.published === false ? 0 : 1,
    user.id
  ).run();

  return json({ id: result.meta.last_row_id }, { status: 201 });
}

export async function updateVideo({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  const video = await env.DB.prepare('SELECT * FROM videos WHERE id = ?').bind(params.id).first();
  if (!video) return notFound();

  const body = await request.json().catch(() => ({}));
  await env.DB.prepare(
    `UPDATE videos SET title = ?, subject = ?, description = ?, placements = ?, published = ? WHERE id = ?`
  ).bind(
    body.title ?? video.title,
    body.subject ?? video.subject,
    body.description ?? video.description,
    body.placements ? normalizePlacements(body.placements) : video.placements,
    body.published === false ? 0 : 1,
    params.id
  ).run();
  return json({ ok: true });
}

export async function deleteVideo({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  const video = await env.DB.prepare('SELECT * FROM videos WHERE id = ?').bind(params.id).first();
  if (!video) return notFound();

  if (video.source_type === 'file' && video.file_key) {
    await env.MATERIALS.delete(video.file_key);
  }
  await env.DB.prepare('DELETE FROM videos WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
}

// Streams an R2-hosted video with HTTP Range support, so the player's
// seek bar and picture-in-picture actually work instead of downloading
// the whole file every time.
export async function streamVideo({ request, params, env }) {
  const video = await env.DB.prepare('SELECT * FROM videos WHERE id = ?').bind(params.id).first();
  if (!video || video.source_type !== 'file' || !video.file_key) return notFound();

  const rangeHeader = request.headers.get('Range');
  const range = rangeHeader ? parseRange(rangeHeader) : undefined;
  const object = await env.MATERIALS.get(video.file_key, range ? { range } : undefined);
  if (!object) return notFound('File missing from storage.');

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  if (range && object.range) {
    const { offset, length } = object.range;
    headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
    return new Response(object.body, { status: 206, headers });
  }
  return new Response(object.body, { headers });
}

// ---- Watch progress (signed-in viewers only) ----

// A video counts as "completed" once the viewer has reached ~92% of the
// way through — leaving room for outro/credits without requiring the
// exact last second, which timeupdate events rarely land on precisely.
const COMPLETION_RATIO = 0.92;

export async function getProgress({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const row = await env.DB.prepare(
    'SELECT position_seconds, completed, updated_at FROM video_progress WHERE user_id = ? AND video_id = ?'
  ).bind(user.id, params.id).first();
  return json({
    position_seconds: row ? row.position_seconds : 0,
    completed: row ? !!row.completed : false,
  });
}

export async function saveProgress({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const video = await env.DB.prepare('SELECT duration_seconds FROM videos WHERE id = ?').bind(params.id).first();
  if (!video) return notFound();

  const body = await request.json().catch(() => null);
  const position = Number(body?.position_seconds);
  if (!Number.isFinite(position) || position < 0) return badRequest('A non-negative position_seconds is required.');

  const duration = Number(video.duration_seconds) || 0;
  const completed = duration > 0 && position >= duration * COMPLETION_RATIO ? 1 : 0;

  await env.DB.prepare(
    `INSERT INTO video_progress (user_id, video_id, position_seconds, completed, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, video_id) DO UPDATE SET
       position_seconds = excluded.position_seconds,
       completed = MAX(video_progress.completed, excluded.completed),
       updated_at = excluded.updated_at`
  ).bind(user.id, params.id, Math.floor(position), completed).run();

  return json({ ok: true, completed: !!completed });
}

// "Continue Watching" row: the viewer's most recently-updated in-progress
// videos (started, not yet completed), newest first.
export async function continueWatching({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const { results } = await env.DB.prepare(
    `SELECT v.id, v.title, v.subject, v.thumbnail_url, v.duration_seconds,
            p.position_seconds, p.updated_at
     FROM video_progress p
     JOIN videos v ON v.id = p.video_id
     WHERE p.user_id = ? AND p.completed = 0 AND v.published = 1
     ORDER BY p.updated_at DESC
     LIMIT 8`
  ).bind(user.id).all();
  return json({ videos: results });
}

function parseRange(rangeHeader) {
  const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
  if (!match) return undefined;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : undefined;
  return end !== undefined ? { offset: start, length: end - start + 1 } : { offset: start };
}
