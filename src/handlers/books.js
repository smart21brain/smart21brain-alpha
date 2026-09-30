import { getSessionUser, json, badRequest, unauthorized, forbidden, notFound, slugify } from '../lib/auth.js';

function withPageCount(book) {
  let pageCount = 0;
  try { pageCount = JSON.parse(book.pages).length; } catch { /* leave 0 */ }
  const { pages, ...rest } = book;
  return { ...rest, page_count: pageCount };
}

export async function listBooks({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM books WHERE published = 1 ORDER BY created_at DESC'
  ).all();
  return json({ books: results.map(withPageCount) });
}

export async function createBook({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  const body = await request.json().catch(() => null);
  if (!body || !body.title || !Array.isArray(body.pages) || body.pages.length === 0) {
    return badRequest('Title and at least one page are required.');
  }
  for (const p of body.pages) {
    if (typeof p.text !== 'string' || !p.text.trim()) {
      return badRequest('Each page needs at least a "text" field.');
    }
  }

  const slug = slugify(body.slug || body.title);
  const result = await env.DB.prepare(
    `INSERT INTO books (title, slug, subject, description, cover_url, pages, published, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.title, slug, body.subject || null, body.description || null, body.cover_url || null,
    JSON.stringify(body.pages), body.published === false ? 0 : 1, user.id
  ).run();

  return json({ id: result.meta.last_row_id, slug }, { status: 201 });
}

// Looked up by numeric id (admin "manage content" list, reader deep links
// via ?id=) or by slug (reader deep links via ?slug=, book cards).
export async function getBook({ params, env }) {
  const key = params.id;
  const isNumeric = /^\d+$/.test(key);
  const book = await env.DB.prepare(
    isNumeric ? 'SELECT * FROM books WHERE id = ?' : 'SELECT * FROM books WHERE slug = ?'
  ).bind(key).first();
  if (!book) return notFound();
  book.pages = JSON.parse(book.pages);
  return json({ book });
}

export async function updateBook({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  const book = await env.DB.prepare('SELECT * FROM books WHERE id = ?').bind(params.id).first();
  if (!book) return notFound();

  const body = await request.json().catch(() => ({}));
  await env.DB.prepare(
    `UPDATE books SET title = ?, subject = ?, description = ?, cover_url = ?, pages = ?, published = ? WHERE id = ?`
  ).bind(
    body.title ?? book.title,
    body.subject ?? book.subject,
    body.description ?? book.description,
    body.cover_url ?? book.cover_url,
    body.pages ? JSON.stringify(body.pages) : book.pages,
    body.published === false ? 0 : 1,
    params.id
  ).run();
  return json({ ok: true });
}

export async function deleteBook({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  await env.DB.prepare('DELETE FROM books WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
}

// ---- Reading progress (signed-in readers only) ----

export async function getProgress({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const row = await env.DB.prepare(
    'SELECT page, updated_at FROM book_progress WHERE user_id = ? AND book_id = ?'
  ).bind(user.id, params.id).first();
  return json({ page: row ? row.page : null, updated_at: row ? row.updated_at : null });
}

export async function saveProgress({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const page = Number(body?.page);
  if (!Number.isFinite(page) || page < 0) return badRequest('A non-negative page number is required.');

  await env.DB.prepare(
    `INSERT INTO book_progress (user_id, book_id, page, updated_at) VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, book_id) DO UPDATE SET page = excluded.page, updated_at = excluded.updated_at`
  ).bind(user.id, params.id, page).run();

  return json({ ok: true });
}
