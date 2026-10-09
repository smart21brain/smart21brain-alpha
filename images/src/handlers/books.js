import { getSessionUser, json, badRequest, unauthorized, forbidden, notFound, slugify } from '../lib/auth.js';

// Books are either "text" books (pages JSON) or uploaded PDF books (file
// kept in R2, with an optional uploaded cover image).
function withPageCount(book) {
  let pageCount = 0;
  try { pageCount = JSON.parse(book.pages).length; } catch { /* leave 0 */ }
  const { pages, pdf_key, cover_key, ...rest } = book;
  const isPdf = !!pdf_key;
  return {
    ...rest,
    page_count: isPdf ? (book.pdf_pages || 0) : pageCount,
    is_pdf: isPdf,
    cover_url: cover_key ? `/api/books/${book.id}/cover` : (book.cover_url || null),
  };
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


const MAX_PDF_BYTES = 50 * 1024 * 1024;   // 50 MB
const MAX_COVER_BYTES = 5 * 1024 * 1024;  // 5 MB
const COVER_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

function safeName(name) { return String(name || 'file').replace(/[^\w.\-]/g, '_').slice(0, 80); }

// Admin: upload a PDF book (and optionally its cover image) from a computer.
// multipart/form-data: title, subject, description, pdf_pages (optional),
// file "pdf" (required), file "cover" (optional image).
export async function uploadPdfBook({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  const form = await request.formData().catch(() => null);
  const pdf = form?.get('pdf');
  const cover = form?.get('cover');
  const title = (form?.get('title') || '').toString().trim();
  if (!form || !title || !pdf || typeof pdf === 'string') {
    return badRequest('A title and a PDF file are required.');
  }
  const looksPdf = pdf.type === 'application/pdf' || /\.pdf$/i.test(pdf.name || '');
  if (!looksPdf) return badRequest('The book file must be a PDF.');
  if (pdf.size > MAX_PDF_BYTES) return badRequest('PDF is too large (50MB max).');

  const hasCover = cover && typeof cover !== 'string' && cover.size > 0;
  if (hasCover) {
    if (!COVER_TYPES.includes(cover.type)) return badRequest('Cover must be a PNG, JPG, WEBP or GIF image.');
    if (cover.size > MAX_COVER_BYTES) return badRequest('Cover image is too large (5MB max).');
  }

  const stamp = `${Date.now()}-${crypto.randomUUID()}`;
  const pdfKey = `books/${stamp}-${safeName(pdf.name)}`;
  await env.MATERIALS.put(pdfKey, await pdf.arrayBuffer(), { httpMetadata: { contentType: 'application/pdf' } });

  let coverKey = null;
  if (hasCover) {
    coverKey = `books/covers/${stamp}-${safeName(cover.name)}`;
    await env.MATERIALS.put(coverKey, await cover.arrayBuffer(), { httpMetadata: { contentType: cover.type } });
  }

  // Unique slug: add a short suffix if the title was used before.
  let slug = slugify(form.get('slug') || title);
  const taken = await env.DB.prepare('SELECT id FROM books WHERE slug = ?').bind(slug).first();
  if (taken) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const pdfPages = Math.max(0, parseInt(form.get('pdf_pages'), 10) || 0);
  try {
    const result = await env.DB.prepare(
      `INSERT INTO books (title, slug, subject, description, cover_url, pages, published, created_by, pdf_key, cover_key, pdf_pages)
       VALUES (?, ?, ?, ?, NULL, '[]', 1, ?, ?, ?, ?)`
    ).bind(
      title, slug, form.get('subject') || null, form.get('description') || null,
      user.id, pdfKey, coverKey, pdfPages
    ).run();
    return json({ id: result.meta.last_row_id, slug }, { status: 201 });
  } catch (err) {
    // Don't leave orphaned files behind if the database insert fails.
    await env.MATERIALS.delete(pdfKey);
    if (coverKey) await env.MATERIALS.delete(coverKey);
    return badRequest('Could not save the book. Has the books table been updated? (run migrations/phase9-book-pdf.sql)');
  }
}

async function streamBookFile(env, key, fallbackType, disposition) {
  const object = await env.MATERIALS.get(key);
  if (!object) return notFound('File missing from storage.');
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (!headers.get('Content-Type')) headers.set('Content-Type', fallbackType);
  if (disposition) headers.set('Content-Disposition', disposition);
  headers.set('Cache-Control', 'public, max-age=3600');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(object.body, { headers });
}

export async function getBookPdf({ params, env, url }) {
  const book = await env.DB.prepare('SELECT title, pdf_key, published FROM books WHERE id = ?').bind(params.id).first();
  if (!book || !book.pdf_key || !book.published) return notFound();
  const name = safeName(book.title) + '.pdf';
  const dl = url && url.searchParams.get('download') === '1';
  return streamBookFile(env, book.pdf_key, 'application/pdf', `${dl ? 'attachment' : 'inline'}; filename="${name}"`);
}

export async function getBookCover({ params, env }) {
  const book = await env.DB.prepare('SELECT cover_key, published FROM books WHERE id = ?').bind(params.id).first();
  if (!book || !book.cover_key || !book.published) return notFound();
  return streamBookFile(env, book.cover_key, 'image/jpeg', null);
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
  if (book.pdf_key) {
    book.is_pdf = true;
    book.pdf_url = `/api/books/${book.id}/pdf`;
    book.page_count = book.pdf_pages || 0;
  }
  if (book.cover_key) book.cover_url = `/api/books/${book.id}/cover`;
  delete book.pdf_key; delete book.cover_key;
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

  const book = await env.DB.prepare('SELECT pdf_key, cover_key FROM books WHERE id = ?').bind(params.id).first();
  if (book?.pdf_key) await env.MATERIALS.delete(book.pdf_key);
  if (book?.cover_key) await env.MATERIALS.delete(book.cover_key);
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
