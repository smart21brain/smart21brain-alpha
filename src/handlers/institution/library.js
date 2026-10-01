// Smart21Institution — library: OPAC, resources (books & copies), circulation
// (issue / return / renew / reserve), fines and overdue tracking.
import { json } from '../../lib/auth.js';
import {
  HttpError, fail, secure, readJson, V, audit, notify, userIdForBorrower, getSettings, likeTerm, paging, can,
  localToday, addDays, daysBetween, round2, storeImage, imageResponse, getInstContext, errorResponse,
} from '../../lib/institution-auth.js';

const COPY_STATUSES = ['available', 'borrowed', 'reserved', 'lost', 'damaged', 'archived'];

// ---------------------------------------------------------------------
// Shared: availability per book (always derived from the copies)
// ---------------------------------------------------------------------
const COPY_STATS_JOIN = `LEFT JOIN (
    SELECT book_id, COUNT(*) AS total, SUM(status = 'available') AS avail, SUM(status = 'borrowed') AS borrowed,
           SUM(status = 'reserved') AS reserved, SUM(status = 'lost') AS lost, SUM(status = 'damaged') AS damaged, SUM(status = 'archived') AS archived
    FROM ins_book_copies WHERE institution_id = ?1 GROUP BY book_id
  ) cc ON cc.book_id = b.id`;

export function availabilityOf(b) {
  const n = (k) => Number(b[k] || 0);
  if (b.archived) return 'archived';
  if (n('avail') > 0) return 'available';
  if (n('reserved') > 0) return 'reserved';
  if (n('borrowed') > 0) return 'borrowed';
  if (n('damaged') > 0) return 'damaged';
  if (n('lost') > 0) return 'lost';
  if (n('archived') > 0) return 'archived';
  return 'unavailable';
}

function shapeBook(b, { staff = false } = {}) {
  const out = {
    id: b.id, isbn: b.isbn, title: b.title, author: b.author, publisher: b.publisher, pub_year: b.pub_year, edition: b.edition,
    category_id: b.category_id, category: b.category, subject: b.subject, language: b.language, description: b.description,
    shelf: b.shelf, classification_no: b.classification_no, has_cover: !!b.cover_key, archived: !!b.archived,
    copies: Number(b.total || 0), available: Number(b.avail || 0), borrowed: Number(b.borrowed || 0), reserved: Number(b.reserved || 0),
    lost: Number(b.lost || 0), damaged: Number(b.damaged || 0), archived_copies: Number(b.archived_copies ?? b.archived_c ?? 0),
    status: availabilityOf({ ...b, archived: b.archived }),
  };
  if (staff) Object.assign(out, { acquisition_date: b.acquisition_date, acquisition_source: b.acquisition_source, price: b.price, notes: b.notes, created_at: b.created_at });
  return out;
}

// OPAC search shared by the signed-in catalogue and the public one.
async function searchBooks(env, instId, url, { staff }) {
  const sp = url.searchParams;
  const { page, limit, offset } = paging(url, 12, 60);
  const where = ['b.institution_id = ?1', 'b.deleted_at IS NULL']; const binds = [instId];
  const add = (sql, ...v) => { let i = binds.length; where.push(sql.replace(/\?/g, () => `?${++i}`)); binds.push(...v); };

  const q = (sp.get('q') || '').trim();
  const field = sp.get('field') || 'all';
  if (q) {
    const like = likeTerm(q);
    const cols = {
      title: ['b.title'], author: ['b.author'], isbn: ['b.isbn'], publisher: ['b.publisher'], subject: ['b.subject'], category: ['cat.name'],
      all: ['b.title', 'b.author', 'b.isbn', 'b.publisher', 'b.subject', 'cat.name', 'b.classification_no'],
    }[field] || ['b.title'];
    if (field === 'isbn') {
      const digits = q.replace(/[\s-]/g, '');
      add(`REPLACE(b.isbn, '-', '') LIKE ? ESCAPE '\\'`, likeTerm(digits));
    } else add(`(${cols.map((c) => `${c} LIKE ? ESCAPE '\\'`).join(' OR ')})`, ...cols.map(() => like));
  }
  if (sp.get('category_id')) add('b.category_id = ?', V.int(sp.get('category_id'), 'Category', { min: 1 }));
  if (sp.get('language')) add('b.language = ? COLLATE NOCASE', V.str(sp.get('language'), 'Language', { max: 40 }));
  if (sp.get('year_from')) add('b.pub_year >= ?', V.int(sp.get('year_from'), 'Year from', { min: 0, max: 3000 }));
  if (sp.get('year_to')) add('b.pub_year <= ?', V.int(sp.get('year_to'), 'Year to', { min: 0, max: 3000 }));
  if (!staff) where.push('b.archived = 0');
  else if (sp.get('archived') === '1') where.push('b.archived = 1'); else if (sp.get('archived') !== 'all') where.push('b.archived = 0');

  const st = sp.get('status');
  if (st) {
    const cond = {
      available: 'COALESCE(cc.avail,0) > 0',
      reserved: 'COALESCE(cc.avail,0) = 0 AND COALESCE(cc.reserved,0) > 0',
      borrowed: 'COALESCE(cc.avail,0) = 0 AND COALESCE(cc.reserved,0) = 0 AND COALESCE(cc.borrowed,0) > 0',
      damaged: 'COALESCE(cc.avail,0) = 0 AND COALESCE(cc.reserved,0) = 0 AND COALESCE(cc.borrowed,0) = 0 AND COALESCE(cc.damaged,0) > 0',
      lost: 'COALESCE(cc.avail,0) = 0 AND COALESCE(cc.reserved,0) = 0 AND COALESCE(cc.borrowed,0) = 0 AND COALESCE(cc.damaged,0) = 0 AND COALESCE(cc.lost,0) > 0',
    }[st];
    if (!cond) fail(400, 'Unknown availability filter.');
    where.push(cond);
  }
  const SORTS = { title: 'b.title COLLATE NOCASE ASC', author: 'b.author COLLATE NOCASE ASC', year: 'b.pub_year DESC', year_asc: 'b.pub_year ASC', recent: 'b.id DESC' };
  const order = SORTS[sp.get('sort')] || SORTS.title;
  const base = `FROM ins_books b LEFT JOIN ins_categories cat ON cat.id = b.category_id ${COPY_STATS_JOIN} WHERE ${where.join(' AND ')}`;
  const [{ results }, count] = await Promise.all([
    env.DB.prepare(`SELECT b.*, cat.name AS category, cc.total, cc.avail, cc.borrowed, cc.reserved, cc.lost, cc.damaged, cc.archived AS archived_c ${base} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${base}`).bind(...binds).first(),
  ]);
  return { books: results.map((b) => shapeBook({ ...b, archived: b.archived }, { staff })), total: count.n, page, limit };
}

// Signed-in catalogue (every role can search; students see the same as the public)
export const opac = secure(async ({ env, url, ctx }) => {
  const r = await searchBooks(env, ctx.inst.id, url, { staff: can(ctx, 'books.manage') || can(ctx, 'books.view') });
  return json(r);
});

// One catalogue entry for any signed-in member (students use this for the detail popup)
export const opacBook = secure(async ({ env, params, ctx }) => {
  const b = await env.DB.prepare(
    `SELECT b.*, cat.name AS category, cc.total, cc.avail, cc.borrowed, cc.reserved, cc.lost, cc.damaged, cc.archived AS archived_c
     FROM ins_books b LEFT JOIN ins_categories cat ON cat.id = b.category_id ${COPY_STATS_JOIN}
     WHERE b.id = ?2 AND b.institution_id = ?1 AND b.deleted_at IS NULL AND b.archived = 0`).bind(ctx.inst.id, params.id).first();
  if (!b) fail(404, 'The book could not be found.');
  return json({ book: shapeBook(b) });
});

// Suggestions while typing
export const suggest = secure(async ({ env, url, ctx }) => {
  const q = (url.searchParams.get('q') || '').trim();
  if (q.length < 2) return json({ suggestions: [] });
  const like = likeTerm(q);
  const { results } = await env.DB.prepare(
    `SELECT id, title, author FROM ins_books WHERE institution_id = ? AND deleted_at IS NULL AND archived = 0 AND (title LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\') ORDER BY title LIMIT 6`
  ).bind(ctx.inst.id, like, like).all();
  return json({ suggestions: results });
});

async function loadInstBySlug(env, slug) {
  const i = await env.DB.prepare('SELECT id, is_public FROM ins_institutions WHERE slug = ?').bind(slug).first();
  if (!i) fail(404, 'This institution could not be found.');
  if (!i.is_public) fail(403, 'This institution has not made its catalogue public.');
  return i;
}

// Public catalogue — no sign-in, only public information
export async function publicOpac({ params, env, url }) {
  try {
    const i = await loadInstBySlug(env, params.slug);
    const r = await searchBooks(env, i.id, url, { staff: false });
    return json(r);
  } catch (e) { return errorResponse(e); }
}
export async function publicBook({ params, env }) {
  try {
    const i = await loadInstBySlug(env, params.slug);
    const b = await env.DB.prepare(
      `SELECT b.*, cat.name AS category, cc.total, cc.avail, cc.borrowed, cc.reserved, cc.lost, cc.damaged, cc.archived AS archived_c
       FROM ins_books b LEFT JOIN ins_categories cat ON cat.id = b.category_id ${COPY_STATS_JOIN}
       WHERE b.id = ?2 AND b.institution_id = ?1 AND b.deleted_at IS NULL AND b.archived = 0`).bind(i.id, params.id).first();
    if (!b) fail(404, 'This book could not be found.');
    return json({ book: shapeBook(b) });
  } catch (e) { return errorResponse(e); }
}
export async function publicResources({ params, env, url }) {
  try {
    const i = await loadInstBySlug(env, params.slug);
    const { page, limit, offset } = paging(url, 12, 50);
    const q = (url.searchParams.get('q') || '').trim();
    const like = likeTerm(q);
    const w = q ? `AND (r.title LIKE ? ESCAPE '\\' OR r.author LIKE ? ESCAPE '\\' OR r.subject LIKE ? ESCAPE '\\')` : '';
    const binds = q ? [i.id, like, like, like] : [i.id];
    const [{ results }, n] = await Promise.all([
      env.DB.prepare(`SELECT r.id, r.title, r.author, r.description, r.res_type, r.allow_view, r.allow_download, r.file_size, c.name AS category FROM ins_resources r LEFT JOIN ins_resource_categories c ON c.id = r.category_id
        WHERE r.institution_id = ? AND r.deleted_at IS NULL AND r.access_level = 'public' ${w} ORDER BY r.title LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_resources r WHERE r.institution_id = ? AND r.deleted_at IS NULL AND r.access_level = 'public' ${w}`).bind(...binds).first(),
    ]);
    return json({ resources: results, total: n.n, page, limit });
  } catch (e) { return errorResponse(e); }
}

// Book covers: served to members, or to anyone when the institution's catalogue is public.
export async function bookCover({ request, env, params }) {
  try {
    const b = await env.DB.prepare('SELECT b.cover_key, b.institution_id, i.is_public FROM ins_books b JOIN ins_institutions i ON i.id = b.institution_id WHERE b.id = ? AND b.deleted_at IS NULL').bind(params.id).first();
    if (!b || !b.cover_key) return new Response('Not found', { status: 404 });
    if (!b.is_public) {
      const ctx = await getInstContext(request, env);
      if (ctx.error || !ctx.inst || ctx.inst.id !== b.institution_id) return new Response('Not found', { status: 404 });
    }
    return imageResponse(env, b.cover_key);
  } catch (e) { return new Response('Not found', { status: 404 }); }
}

// ---------------------------------------------------------------------
// Books (staff): read one, create, edit, archive, delete
// ---------------------------------------------------------------------
function cleanIsbn(v) {
  if (v == null || String(v).trim() === '') return null;
  const s = String(v).replace(/[\s-]/g, '').toUpperCase();
  if (!/^(\d{9}[\dX]|\d{13})$/.test(s)) fail(400, 'ISBN must be 10 or 13 digits (hyphens are fine).');
  return s;
}

export function readBook(b) {
  const year = V.int(b.pub_year, 'Publication year', { min: 1000, max: new Date().getUTCFullYear() + 1 });
  return {
    isbn: cleanIsbn(b.isbn),
    title: V.str(b.title, 'Title', { required: true, max: 250, min: 1 }),
    author: V.str(b.author, 'Author', { required: true, max: 200 }),
    publisher: V.str(b.publisher, 'Publisher', { max: 160 }),
    pub_year: year,
    edition: V.str(b.edition, 'Edition', { max: 60 }),
    category_id: V.int(b.category_id, 'Category', { min: 1 }),
    subject: V.str(b.subject, 'Subject', { max: 160 }),
    language: V.str(b.language, 'Language', { max: 40 }),
    description: V.str(b.description, 'Description', { max: 2000 }),
    shelf: V.str(b.shelf, 'Shelf / location', { max: 60 }),
    classification_no: V.str(b.classification_no, 'Classification number', { max: 60 }),
    acquisition_date: V.date(b.acquisition_date, 'Acquisition date'),
    acquisition_source: V.str(b.acquisition_source, 'Acquisition source', { max: 160 }),
    price: V.num(b.price, 'Price', { min: 0, max: 1e9 }),
    notes: V.str(b.notes, 'Notes', { max: 1000 }),
  };
}

async function assertCategory(env, instId, id) {
  if (!id) return;
  const c = await env.DB.prepare('SELECT id FROM ins_categories WHERE id = ? AND institution_id = ?').bind(id, instId).first();
  if (!c) fail(400, 'That category does not exist.');
}

async function allocAccessions(env, instId, prefix, n) {
  const r = await env.DB.prepare(
    `SELECT COALESCE(MAX(CAST(SUBSTR(accession_no, ?) AS INTEGER)), 0) AS m FROM ins_book_copies WHERE institution_id = ? AND accession_no LIKE ?`
  ).bind(prefix.length + 2, instId, `${prefix}-%`).first();
  const start = (r?.m || 0) + 1;
  return Array.from({ length: n }, (_, i) => `${prefix}-${String(start + i).padStart(5, '0')}`);
}

export async function addCopies(env, ctx, bookId, n, { status = 'available' } = {}) {
  const settings = await getSettings(env, ctx.inst.id);
  const nos = await allocAccessions(env, ctx.inst.id, settings.accession_prefix, n);
  await env.DB.batch(nos.map((no) => env.DB.prepare('INSERT INTO ins_book_copies (institution_id, book_id, accession_no, barcode, status) VALUES (?, ?, ?, ?, ?)').bind(ctx.inst.id, bookId, no, no, status)));
  return nos;
}

export const getBook = secure({ perm: ['books.view', 'books.manage'] }, async ({ env, params, ctx }) => {
  const b = await env.DB.prepare(
    `SELECT b.*, cat.name AS category, cc.total, cc.avail, cc.borrowed, cc.reserved, cc.lost, cc.damaged, cc.archived AS archived_c
     FROM ins_books b LEFT JOIN ins_categories cat ON cat.id = b.category_id ${COPY_STATS_JOIN}
     WHERE b.id = ?2 AND b.institution_id = ?1 AND b.deleted_at IS NULL`).bind(ctx.inst.id, params.id).first();
  if (!b) fail(404, 'The book could not be found.');
  const [copies, loans, resv] = await Promise.all([
    env.DB.prepare(`SELECT c.id, c.accession_no, c.barcode, c.status, c.note,
        (SELECT l.due_date FROM ins_loans l WHERE l.copy_id = c.id AND l.status = 'borrowed' LIMIT 1) AS due_date,
        (SELECT l.id FROM ins_loans l WHERE l.copy_id = c.id AND l.status = 'borrowed' LIMIT 1) AS loan_id
      FROM ins_book_copies c WHERE c.book_id = ? AND c.institution_id = ? ORDER BY c.accession_no`).bind(b.id, ctx.inst.id).all().then((r) => r.results),
    env.DB.prepare(`SELECT l.id, l.issued_on, l.due_date, l.returned_on, l.status, l.borrower_type, l.borrower_id,
        CASE l.borrower_type WHEN 'student' THEN (SELECT full_name FROM ins_students WHERE id = l.borrower_id) ELSE (SELECT full_name FROM ins_staff WHERE id = l.borrower_id) END AS borrower_name,
        c.accession_no FROM ins_loans l JOIN ins_book_copies c ON c.id = l.copy_id WHERE l.book_id = ? AND l.institution_id = ? ORDER BY l.id DESC LIMIT 15`).bind(b.id, ctx.inst.id).all().then((r) => r.results),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_reservations WHERE book_id = ? AND institution_id = ? AND status IN ('waiting','ready')`).bind(b.id, ctx.inst.id).first(),
  ]);
  return json({ book: shapeBook(b, { staff: true }), copy_list: copies, history: loans, reservations: resv.n });
});

export const createBook = secure({ perm: 'books.manage' }, async ({ request, env, ctx }) => {
  const body = await readJson(request);
  const b = readBook(body);
  const copies = V.int(body.copies ?? 1, 'Number of copies', { min: 1, max: 200 });
  await assertCategory(env, ctx.inst.id, b.category_id);
  if (b.isbn) {
    const dup = await env.DB.prepare('SELECT id, title FROM ins_books WHERE institution_id = ? AND isbn = ? AND deleted_at IS NULL').bind(ctx.inst.id, b.isbn).first();
    if (dup) throw new HttpError(409, `"${dup.title}" is already in the catalogue with this ISBN. Open it and add copies instead.`, { existing_id: dup.id });
  }
  const r = await env.DB.prepare(
    `INSERT INTO ins_books (institution_id, isbn, title, author, publisher, pub_year, edition, category_id, subject, language, description, shelf, classification_no, acquisition_date, acquisition_source, price, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(ctx.inst.id, b.isbn, b.title, b.author, b.publisher, b.pub_year, b.edition, b.category_id, b.subject, b.language, b.description, b.shelf, b.classification_no, b.acquisition_date, b.acquisition_source, b.price, b.notes).run();
  const id = r.meta.last_row_id;
  const nos = await addCopies(env, ctx, id, copies);
  await audit(env, request, ctx, 'library', 'book.create', 'book', id, `${b.title} (${copies} cop${copies === 1 ? 'y' : 'ies'})`);
  return json({ ok: true, id, accession_nos: nos }, { status: 201 });
});

export const updateBook = secure({ perm: 'books.manage' }, async ({ request, env, params, ctx }) => {
  const cur = await env.DB.prepare('SELECT id FROM ins_books WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!cur) fail(404, 'The book could not be found.');
  const b = readBook(await readJson(request));
  await assertCategory(env, ctx.inst.id, b.category_id);
  if (b.isbn) {
    const dup = await env.DB.prepare('SELECT id, title FROM ins_books WHERE institution_id = ? AND isbn = ? AND id != ? AND deleted_at IS NULL').bind(ctx.inst.id, b.isbn, cur.id).first();
    if (dup) throw new HttpError(409, `"${dup.title}" already uses this ISBN.`, { existing_id: dup.id });
  }
  await env.DB.prepare(
    `UPDATE ins_books SET isbn=?, title=?, author=?, publisher=?, pub_year=?, edition=?, category_id=?, subject=?, language=?, description=?, shelf=?, classification_no=?,
       acquisition_date=?, acquisition_source=?, price=?, notes=?, updated_at=datetime('now') WHERE id = ? AND institution_id = ?`
  ).bind(b.isbn, b.title, b.author, b.publisher, b.pub_year, b.edition, b.category_id, b.subject, b.language, b.description, b.shelf, b.classification_no,
    b.acquisition_date, b.acquisition_source, b.price, b.notes, cur.id, ctx.inst.id).run();
  await audit(env, request, ctx, 'library', 'book.update', 'book', cur.id, b.title);
  return json({ ok: true });
});

export const archiveBook = secure({ perm: 'books.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const r = await env.DB.prepare(`UPDATE ins_books SET archived = ?, updated_at = datetime('now') WHERE id = ? AND institution_id = ? AND deleted_at IS NULL`).bind(b.archived ? 1 : 0, params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, 'The book could not be found.');
  await audit(env, request, ctx, 'library', b.archived ? 'book.archive' : 'book.restore', 'book', Number(params.id), null);
  return json({ ok: true });
});

export const deleteBook = secure({ perm: 'books.manage' }, async ({ request, env, params, ctx }) => {
  const b = await env.DB.prepare('SELECT id, title FROM ins_books WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!b) fail(404, 'The book could not be found.');
  const active = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_loans WHERE book_id = ? AND status = 'borrowed'`).bind(b.id).first();
  if (active.n) fail(409, 'This book still has copies on loan. Return them first, or archive the book instead.');
  await env.DB.batch([
    env.DB.prepare(`UPDATE ins_books SET deleted_at = datetime('now') WHERE id = ?`).bind(b.id),
    env.DB.prepare(`UPDATE ins_reservations SET status = 'cancelled' WHERE book_id = ? AND status IN ('waiting','ready')`).bind(b.id),
  ]);
  await audit(env, request, ctx, 'library', 'book.delete', 'book', b.id, b.title);
  return json({ ok: true });
});

export const uploadCover = secure({ perm: 'books.manage' }, async ({ request, env, params, ctx }) => {
  const b = await env.DB.prepare('SELECT id, cover_key FROM ins_books WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!b) fail(404, 'The book could not be found.');
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, 'Please choose a cover image.');
  const key = await storeImage(env, form.get('cover'), `institution/${ctx.inst.id}/cover`);
  await env.DB.prepare(`UPDATE ins_books SET cover_key = ?, updated_at = datetime('now') WHERE id = ?`).bind(key, b.id).run();
  if (b.cover_key && env.MATERIALS) await env.MATERIALS.delete(b.cover_key).catch(() => {});
  await audit(env, request, ctx, 'library', 'book.cover', 'book', b.id, null);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Copies
// ---------------------------------------------------------------------
export const addBookCopies = secure({ perm: 'books.manage' }, async ({ request, env, params, ctx }) => {
  const b = await env.DB.prepare('SELECT id, title FROM ins_books WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!b) fail(404, 'The book could not be found.');
  const n = V.int((await readJson(request)).count, 'Number of copies', { required: true, min: 1, max: 200 });
  const nos = await addCopies(env, ctx, b.id, n);
  await audit(env, request, ctx, 'library', 'copy.add', 'book', b.id, `${n} copies added to ${b.title}`);
  return json({ ok: true, accession_nos: nos }, { status: 201 });
});

// Change a copy's condition: available | lost | damaged | archived
export const setCopyStatus = secure({ perm: 'books.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const status = V.oneOf(b.status, 'Status', ['available', 'lost', 'damaged', 'archived'], { required: true });
  const c = await env.DB.prepare('SELECT * FROM ins_book_copies WHERE id = ? AND institution_id = ?').bind(params.id, ctx.inst.id).first();
  if (!c) fail(404, 'The copy could not be found.');
  if (c.status === 'borrowed') fail(409, 'This copy is on loan. Return it first.');
  if (c.status === 'reserved' && status !== 'available') {
    await env.DB.prepare(`UPDATE ins_reservations SET status = 'waiting', copy_id = NULL, hold_until = NULL WHERE copy_id = ? AND status = 'ready'`).bind(c.id).run();
  }
  await env.DB.prepare('UPDATE ins_book_copies SET status = ?, note = ? WHERE id = ?').bind(status, V.str(b.note, 'Note', { max: 200 }), c.id).run();
  if (status === 'available') await holdForWaiting(env, ctx, c.book_id, c.id);
  await audit(env, request, ctx, 'library', `copy.${status}`, 'copy', c.id, c.accession_no);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------
export const listCategories = secure(async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.name, (SELECT COUNT(*) FROM ins_books b WHERE b.category_id = c.id AND b.deleted_at IS NULL) AS books FROM ins_categories c WHERE c.institution_id = ? ORDER BY c.name`
  ).bind(ctx.inst.id).all();
  return json({ categories: results });
});
export const saveCategory = secure({ perm: 'books.manage' }, async ({ request, env, params, ctx }) => {
  const name = V.str((await readJson(request)).name, 'Category name', { required: true, max: 60, min: 2 });
  const dup = await env.DB.prepare('SELECT id FROM ins_categories WHERE institution_id = ? AND name = ? COLLATE NOCASE AND id != ?').bind(ctx.inst.id, name, Number(params.id) || 0).first();
  if (dup) fail(409, 'A category with this name already exists.');
  if (params.id) {
    const r = await env.DB.prepare('UPDATE ins_categories SET name = ? WHERE id = ? AND institution_id = ?').bind(name, params.id, ctx.inst.id).run();
    if (!r.meta.changes) fail(404, 'Category not found.');
  } else await env.DB.prepare('INSERT INTO ins_categories (institution_id, name) VALUES (?, ?)').bind(ctx.inst.id, name).run();
  await audit(env, request, ctx, 'library', 'category.save', 'category', Number(params.id) || null, name);
  return json({ ok: true });
});
export const deleteCategory = secure({ perm: 'books.manage' }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare('DELETE FROM ins_categories WHERE id = ? AND institution_id = ?').bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, 'Category not found.');
  await audit(env, request, ctx, 'library', 'category.delete', 'category', Number(params.id), null);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Borrowers
// ---------------------------------------------------------------------
async function loadBorrower(env, instId, type, id) {
  if (type === 'student') {
    const s = await env.DB.prepare('SELECT id, student_no AS no, full_name, status FROM ins_students WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(id, instId).first();
    if (!s) fail(404, 'The student record could not be found.');
    if (s.status !== 'active') fail(409, `${s.full_name} is ${s.status} and cannot borrow books.`);
    return s;
  }
  const s = await env.DB.prepare('SELECT id, staff_no AS no, full_name, status FROM ins_staff WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(id, instId).first();
  if (!s) fail(404, 'The staff record could not be found.');
  if (s.status === 'left') fail(409, `${s.full_name} has left and cannot borrow books.`);
  return s;
}

export const searchBorrowers = secure({ perm: ['loans.manage', 'loans.view'] }, async ({ env, url, ctx }) => {
  const q = (url.searchParams.get('q') || '').trim();
  if (q.length < 2) return json({ borrowers: [] });
  const like = likeTerm(q);
  const [st, sf] = await Promise.all([
    env.DB.prepare(`SELECT id, student_no AS no, full_name, class_name AS sub, status FROM ins_students WHERE institution_id = ? AND deleted_at IS NULL AND (full_name LIKE ? ESCAPE '\\' OR student_no LIKE ? ESCAPE '\\' OR reg_no LIKE ? ESCAPE '\\') ORDER BY full_name LIMIT 8`).bind(ctx.inst.id, like, like, like).all(),
    env.DB.prepare(`SELECT id, staff_no AS no, full_name, position AS sub, status FROM ins_staff WHERE institution_id = ? AND deleted_at IS NULL AND (full_name LIKE ? ESCAPE '\\' OR staff_no LIKE ? ESCAPE '\\') ORDER BY full_name LIMIT 6`).bind(ctx.inst.id, like, like).all(),
  ]);
  return json({ borrowers: [...st.results.map((r) => ({ ...r, type: 'student' })), ...sf.results.map((r) => ({ ...r, type: 'staff' }))] });
});

// ---------------------------------------------------------------------
// Sweep: expire held reservations and send overdue reminders (idempotent)
// ---------------------------------------------------------------------
async function holdForWaiting(env, ctx, bookId, copyId) {
  const next = await env.DB.prepare(`SELECT * FROM ins_reservations WHERE institution_id = ? AND book_id = ? AND status = 'waiting' ORDER BY id LIMIT 1`).bind(ctx.inst.id, bookId).first();
  if (!next) return false;
  const settings = await getSettings(env, ctx.inst.id);
  const until = addDays(localToday(ctx.off), settings.reservation_hold_days);
  const r = await env.DB.prepare(`UPDATE ins_book_copies SET status = 'reserved' WHERE id = ? AND status = 'available'`).bind(copyId).run();
  if (!r.meta.changes) return false;
  await env.DB.prepare(`UPDATE ins_reservations SET status = 'ready', copy_id = ?, hold_until = ? WHERE id = ?`).bind(copyId, until, next.id).run();
  const book = await env.DB.prepare('SELECT title FROM ins_books WHERE id = ?').bind(bookId).first();
  const uid = await userIdForBorrower(env, ctx.inst.id, next.borrower_type, next.borrower_id);
  if (uid) await notify(env, ctx.inst.id, uid, 'system', 'Your reserved book is ready', `"${book?.title}" is waiting for you until ${until}.`, '#my-library');
  return true;
}

export async function sweep(env, ctx) {
  const today = localToday(ctx.off);
  const { results: expired } = await env.DB.prepare(`SELECT * FROM ins_reservations WHERE institution_id = ? AND status = 'ready' AND hold_until < ?`).bind(ctx.inst.id, today).all();
  for (const r of expired) {
    await env.DB.prepare(`UPDATE ins_reservations SET status = 'expired' WHERE id = ?`).bind(r.id).run();
    if (r.copy_id) {
      await env.DB.prepare(`UPDATE ins_book_copies SET status = 'available' WHERE id = ? AND status = 'reserved'`).bind(r.copy_id).run();
      await holdForWaiting(env, ctx, r.book_id, r.copy_id);
    }
  }
  const { results: late } = await env.DB.prepare(
    `SELECT l.id, l.borrower_type, l.borrower_id, l.due_date, b.title FROM ins_loans l JOIN ins_books b ON b.id = l.book_id
     WHERE l.institution_id = ? AND l.status = 'borrowed' AND l.due_date < ? AND (l.overdue_notified_on IS NULL OR l.overdue_notified_on < ?) LIMIT 100`
  ).bind(ctx.inst.id, today, addDays(today, -6)).all();
  for (const l of late) {
    const uid = await userIdForBorrower(env, ctx.inst.id, l.borrower_type, l.borrower_id);
    if (uid) await notify(env, ctx.inst.id, uid, 'overdue', 'A book is overdue', `"${l.title}" was due on ${l.due_date}. Please return it to avoid more fines.`, '#my-library');
    await env.DB.prepare('UPDATE ins_loans SET overdue_notified_on = ? WHERE id = ?').bind(today, l.id).run();
  }
}

// ---------------------------------------------------------------------
// Circulation: list, issue, return, renew
// ---------------------------------------------------------------------
const LOAN_SELECT = `SELECT l.id, l.book_id, l.copy_id, l.borrower_type, l.borrower_id, l.issued_on, l.due_date, l.returned_on, l.renewals, l.status, l.return_condition,
    b.title, b.author, c.accession_no,
    CASE l.borrower_type WHEN 'student' THEN s.full_name ELSE f.full_name END AS borrower_name,
    CASE l.borrower_type WHEN 'student' THEN s.student_no ELSE f.staff_no END AS borrower_no
  FROM ins_loans l JOIN ins_books b ON b.id = l.book_id JOIN ins_book_copies c ON c.id = l.copy_id
  LEFT JOIN ins_students s ON l.borrower_type = 'student' AND s.id = l.borrower_id
  LEFT JOIN ins_staff f ON l.borrower_type = 'staff' AND f.id = l.borrower_id`;

function decorateLoan(l, today, finePerDay) {
  const late = l.status === 'borrowed' && l.due_date < today ? daysBetween(l.due_date, today) : 0;
  return { ...l, days_overdue: late, overdue: late > 0, due_today: l.status === 'borrowed' && l.due_date === today, accrued_fine: round2(late * finePerDay) };
}

export const listLoans = secure({ perm: 'loans.view' }, async ({ env, url, ctx }) => {
  await sweep(env, ctx);
  const sp = url.searchParams; const today = localToday(ctx.off);
  const { page, limit, offset } = paging(url, 20, 100);
  const where = ['l.institution_id = ?1']; const binds = [ctx.inst.id];
  const add = (sql, ...v) => { let i = binds.length; where.push(sql.replace(/\?/g, () => `?${++i}`)); binds.push(...v); };
  const f = sp.get('filter') || 'active';
  if (f === 'active') where.push(`l.status = 'borrowed'`);
  else if (f === 'overdue') add(`l.status = 'borrowed' AND l.due_date < ?`, today);
  else if (f === 'due_today') add(`l.status = 'borrowed' AND l.due_date = ?`, today);
  else if (f === 'returned') where.push(`l.status = 'returned'`);
  else if (f === 'lost') where.push(`l.status = 'lost'`);
  else if (f !== 'all') fail(400, 'Unknown loan filter.');
  const q = (sp.get('q') || '').trim();
  if (q) { const like = likeTerm(q); add(`(b.title LIKE ? ESCAPE '\\' OR c.accession_no LIKE ? ESCAPE '\\' OR s.full_name LIKE ? ESCAPE '\\' OR f.full_name LIKE ? ESCAPE '\\' OR s.student_no LIKE ? ESCAPE '\\')`, like, like, like, like, like); }
  if (sp.get('borrower_id') && sp.get('borrower_type')) add('l.borrower_type = ? AND l.borrower_id = ?', V.oneOf(sp.get('borrower_type'), 'Borrower type', ['student', 'staff'], { required: true }), V.int(sp.get('borrower_id'), 'Borrower', { min: 1 }));
  const settings = await getSettings(env, ctx.inst.id);
  const from = `FROM ins_loans l JOIN ins_books b ON b.id = l.book_id JOIN ins_book_copies c ON c.id = l.copy_id LEFT JOIN ins_students s ON l.borrower_type = 'student' AND s.id = l.borrower_id LEFT JOIN ins_staff f ON l.borrower_type = 'staff' AND f.id = l.borrower_id WHERE ${where.join(' AND ')}`;
  const [{ results }, n] = await Promise.all([
    env.DB.prepare(`${LOAN_SELECT} WHERE ${where.join(' AND ')} ORDER BY ${f === 'returned' ? 'l.returned_on DESC, l.id DESC' : 'l.due_date ASC, l.id DESC'} LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${from}`).bind(...binds).first(),
  ]);
  return json({ loans: results.map((l) => decorateLoan(l, today, settings.fine_per_day)), total: n.n, page, limit, today });
});

async function openLoansOf(env, instId, type, id) {
  const { results } = await env.DB.prepare(`SELECT id, book_id, due_date FROM ins_loans WHERE institution_id = ? AND borrower_type = ? AND borrower_id = ? AND status = 'borrowed'`).bind(instId, type, id).all();
  return results;
}

export const issueBook = secure({ perm: 'loans.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const type = V.oneOf(b.borrower_type, 'Borrower type', ['student', 'staff'], { required: true });
  const borrower = await loadBorrower(env, ctx.inst.id, type, V.int(b.borrower_id, 'Borrower', { required: true, min: 1 }));
  const settings = await getSettings(env, ctx.inst.id);
  const today = localToday(ctx.off);

  // Which copy? accession/barcode, a copy id, or simply a book (the system picks a free copy).
  let copy;
  if (b.accession_no) {
    const code = String(b.accession_no).trim();
    copy = await env.DB.prepare('SELECT * FROM ins_book_copies WHERE institution_id = ? AND (accession_no = ? COLLATE NOCASE OR barcode = ? COLLATE NOCASE)').bind(ctx.inst.id, code, code).first();
    if (!copy) fail(404, `No copy found with the number "${code}".`);
  } else if (b.copy_id) {
    copy = await env.DB.prepare('SELECT * FROM ins_book_copies WHERE id = ? AND institution_id = ?').bind(V.int(b.copy_id, 'Copy', { min: 1 }), ctx.inst.id).first();
    if (!copy) fail(404, 'The copy could not be found.');
  } else if (b.book_id) {
    const bid = V.int(b.book_id, 'Book', { required: true, min: 1 });
    copy = await env.DB.prepare(`SELECT c.* FROM ins_book_copies c WHERE c.book_id = ? AND c.institution_id = ? AND c.status = 'available' ORDER BY c.id LIMIT 1`).bind(bid, ctx.inst.id).first();
    if (!copy) {
      copy = await env.DB.prepare(`SELECT c.* FROM ins_book_copies c JOIN ins_reservations r ON r.copy_id = c.id AND r.status = 'ready' AND r.borrower_type = ? AND r.borrower_id = ? WHERE c.book_id = ? AND c.institution_id = ? LIMIT 1`).bind(type, borrower.id, bid, ctx.inst.id).first();
    }
    if (!copy) fail(409, 'This book is currently unavailable.');
  } else fail(400, 'Choose a book or enter a copy number.');

  const book = await env.DB.prepare('SELECT id, title, archived, deleted_at FROM ins_books WHERE id = ? AND institution_id = ?').bind(copy.book_id, ctx.inst.id).first();
  if (!book || book.deleted_at) fail(404, 'The book could not be found.');
  if (book.archived) fail(409, 'This book is archived and cannot be lent.');

  // The copy may be held for this same person.
  let heldFor = null;
  if (copy.status === 'reserved') {
    heldFor = await env.DB.prepare(`SELECT * FROM ins_reservations WHERE copy_id = ? AND status = 'ready'`).bind(copy.id).first();
    if (!heldFor || heldFor.borrower_type !== type || heldFor.borrower_id !== borrower.id) fail(409, 'This copy is reserved for another borrower.');
  } else if (copy.status !== 'available') fail(409, `This copy is ${copy.status} and cannot be issued.`);

  const open = await openLoansOf(env, ctx.inst.id, type, borrower.id);
  const max = type === 'student' ? settings.max_loans_student : settings.max_loans_staff;
  if (open.length >= max) fail(409, `${borrower.full_name} already has ${open.length} books (the limit is ${max}). A book must be returned first.`);
  if (open.some((l) => l.due_date < today)) fail(409, `${borrower.full_name} has an overdue book. It must be returned before borrowing another.`);
  if (open.some((l) => l.book_id === book.id)) fail(409, `${borrower.full_name} already has a copy of this book.`);
  const unpaid = await env.DB.prepare(`SELECT COALESCE(SUM(amount),0) AS t FROM ins_fines WHERE institution_id = ? AND borrower_type = ? AND borrower_id = ? AND status = 'unpaid'`).bind(ctx.inst.id, type, borrower.id).first();
  if (unpaid.t > 0) fail(409, `${borrower.full_name} has unpaid fines of ${round2(unpaid.t)} ${ctx.inst.currency}. Please settle them first.`);

  const claim = await env.DB.prepare(`UPDATE ins_book_copies SET status = 'borrowed' WHERE id = ? AND status IN ('available','reserved')`).bind(copy.id).run();
  if (!claim.meta.changes) fail(409, 'This copy was just issued to someone else.');
  const days = V.int(b.days, 'Loan days', { min: 1, max: 365 }) || (type === 'student' ? settings.loan_days_student : settings.loan_days_staff);
  const due = addDays(today, days);
  const ins = await env.DB.prepare(
    `INSERT INTO ins_loans (institution_id, copy_id, book_id, borrower_type, borrower_id, issued_on, due_date, issued_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(ctx.inst.id, copy.id, book.id, type, borrower.id, today, due, ctx.user.id).run();
  if (heldFor) await env.DB.prepare(`UPDATE ins_reservations SET status = 'fulfilled' WHERE id = ?`).bind(heldFor.id).run();
  else await env.DB.prepare(`UPDATE ins_reservations SET status = 'fulfilled' WHERE institution_id = ? AND book_id = ? AND borrower_type = ? AND borrower_id = ? AND status = 'waiting'`).bind(ctx.inst.id, book.id, type, borrower.id).run();
  const uid = await userIdForBorrower(env, ctx.inst.id, type, borrower.id);
  if (uid) await notify(env, ctx.inst.id, uid, 'system', 'Book issued', `"${book.title}" is due on ${due}.`, '#my-library');
  await audit(env, request, ctx, 'library', 'loan.issue', 'loan', ins.meta.last_row_id, `${book.title} → ${borrower.full_name}, due ${due}`);
  return json({ ok: true, loan_id: ins.meta.last_row_id, due_date: due, borrower: borrower.full_name, title: book.title }, { status: 201 });
});

export const returnBook = secure({ perm: 'loans.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const condition = V.oneOf(b.condition, 'Condition', ['good', 'damaged', 'lost'], { def: 'good' });
  let loan;
  if (b.loan_id) loan = await env.DB.prepare(`SELECT * FROM ins_loans WHERE id = ? AND institution_id = ? AND status = 'borrowed'`).bind(V.int(b.loan_id, 'Loan', { min: 1 }), ctx.inst.id).first();
  else if (b.accession_no) {
    const code = String(b.accession_no).trim();
    loan = await env.DB.prepare(`SELECT l.* FROM ins_loans l JOIN ins_book_copies c ON c.id = l.copy_id WHERE l.institution_id = ? AND l.status = 'borrowed' AND (c.accession_no = ? COLLATE NOCASE OR c.barcode = ? COLLATE NOCASE)`).bind(ctx.inst.id, code, code).first();
  } else fail(400, 'Choose the loan or enter the copy number.');
  if (!loan) fail(404, 'No active loan was found for this book.');

  const settings = await getSettings(env, ctx.inst.id);
  const today = localToday(ctx.off);
  const book = await env.DB.prepare('SELECT id, title, price FROM ins_books WHERE id = ?').bind(loan.book_id).first();
  const lateDays = loan.due_date < today ? daysBetween(loan.due_date, today) : 0;
  const fines = [];
  if (lateDays > 0 && settings.fine_per_day > 0) fines.push({ reason: 'overdue', amount: round2(lateDays * settings.fine_per_day), note: `${lateDays} day(s) late` });
  if (condition === 'lost') fines.push({ reason: 'lost', amount: round2(book.price > 0 ? book.price * settings.lost_fine_multiplier : settings.damaged_fine), note: 'Lost book' });
  if (condition === 'damaged' && settings.damaged_fine > 0) fines.push({ reason: 'damaged', amount: round2(settings.damaged_fine), note: 'Damaged on return' });

  const stmts = [
    env.DB.prepare(`UPDATE ins_loans SET status = ?, returned_on = ?, return_condition = ?, returned_by = ? WHERE id = ?`).bind(condition === 'lost' ? 'lost' : 'returned', today, condition, ctx.user.id, loan.id),
    env.DB.prepare(`UPDATE ins_book_copies SET status = ? WHERE id = ?`).bind(condition === 'good' ? 'available' : condition, loan.copy_id),
    ...fines.filter((x) => x.amount > 0).map((x) => env.DB.prepare(`INSERT INTO ins_fines (institution_id, loan_id, borrower_type, borrower_id, reason, amount, note) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(ctx.inst.id, loan.id, loan.borrower_type, loan.borrower_id, x.reason, x.amount, x.note)),
  ];
  await env.DB.batch(stmts);
  let heldForNext = false;
  if (condition === 'good') heldForNext = await holdForWaiting(env, ctx, loan.book_id, loan.copy_id);
  const total = round2(fines.reduce((s, x) => s + x.amount, 0));
  const uid = await userIdForBorrower(env, ctx.inst.id, loan.borrower_type, loan.borrower_id);
  if (uid && total > 0) await notify(env, ctx.inst.id, uid, 'overdue', 'A fine was added', `${total} ${ctx.inst.currency} for "${book.title}".`, '#my-library');
  await audit(env, request, ctx, 'library', condition === 'lost' ? 'loan.lost' : 'loan.return', 'loan', loan.id, `${book.title}, ${condition}${total ? `, fine ${total}` : ''}`);
  return json({ ok: true, fine: total, days_late: lateDays, held_for_next: heldForNext, title: book.title });
});

export const renewLoan = secure(async ({ request, env, params, ctx }) => {
  const loan = await env.DB.prepare(`SELECT * FROM ins_loans WHERE id = ? AND institution_id = ? AND status = 'borrowed'`).bind(params.id, ctx.inst.id).first();
  if (!loan) fail(404, 'No active loan was found.');
  // Staff with loan rights may renew any loan; everybody else only their own.
  const own = (loan.borrower_type === 'student' && ctx.studentId === loan.borrower_id) || (loan.borrower_type === 'staff' && ctx.staffId === loan.borrower_id);
  if (!can(ctx, 'loans.manage') && !own) fail(403, 'You do not have permission to perform this action.');
  const settings = await getSettings(env, ctx.inst.id);
  const today = localToday(ctx.off);
  if (loan.renewals >= settings.max_renewals) fail(409, `This book has already been renewed ${loan.renewals} time(s), which is the limit.`);
  if (loan.due_date < today) fail(409, 'This book is overdue. Please return it instead of renewing.');
  const waiting = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_reservations WHERE book_id = ? AND status IN ('waiting','ready')`).bind(loan.book_id).first();
  if (waiting.n) fail(409, 'Someone is waiting for this book, so it cannot be renewed.');
  const due = addDays(loan.due_date, settings.renewal_days);
  await env.DB.prepare('UPDATE ins_loans SET due_date = ?, renewals = renewals + 1 WHERE id = ?').bind(due, loan.id).run();
  await audit(env, request, ctx, 'library', 'loan.renew', 'loan', loan.id, `new due ${due}`);
  return json({ ok: true, due_date: due });
});

// ---------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------
export const listReservations = secure({ perm: 'loans.view' }, async ({ env, url, ctx }) => {
  await sweep(env, ctx);
  const st = url.searchParams.get('status') || 'open';
  const cond = st === 'open' ? `r.status IN ('waiting','ready')` : st === 'all' ? '1=1' : `r.status = '${V.oneOf(st, 'Status', ['waiting', 'ready', 'fulfilled', 'cancelled', 'expired'], { required: true })}'`;
  const { results } = await env.DB.prepare(
    `SELECT r.id, r.book_id, r.borrower_type, r.borrower_id, r.status, r.hold_until, r.created_at, b.title, b.author, c.accession_no,
       CASE r.borrower_type WHEN 'student' THEN (SELECT full_name FROM ins_students WHERE id = r.borrower_id) ELSE (SELECT full_name FROM ins_staff WHERE id = r.borrower_id) END AS borrower_name
     FROM ins_reservations r JOIN ins_books b ON b.id = r.book_id LEFT JOIN ins_book_copies c ON c.id = r.copy_id
     WHERE r.institution_id = ? AND ${cond} ORDER BY r.id DESC LIMIT 100`).bind(ctx.inst.id).all();
  return json({ reservations: results });
});

export const createReservation = secure(async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const bookId = V.int(b.book_id, 'Book', { required: true, min: 1 });
  let type; let bid;
  if (can(ctx, 'loans.manage') && b.borrower_id) { type = V.oneOf(b.borrower_type, 'Borrower type', ['student', 'staff'], { required: true }); bid = V.int(b.borrower_id, 'Borrower', { required: true, min: 1 }); }
  else if (ctx.studentId) { type = 'student'; bid = ctx.studentId; }
  else if (ctx.staffId) { type = 'staff'; bid = ctx.staffId; }
  else fail(403, 'Your login is not linked to a student or staff record, so you cannot reserve books. Please ask the librarian.');
  const borrower = await loadBorrower(env, ctx.inst.id, type, bid);
  const book = await env.DB.prepare(`SELECT id, title FROM ins_books WHERE id = ? AND institution_id = ? AND deleted_at IS NULL AND archived = 0`).bind(bookId, ctx.inst.id).first();
  if (!book) fail(404, 'The book could not be found.');
  const stats = await env.DB.prepare(`SELECT COUNT(*) AS total, SUM(status = 'available') AS avail FROM ins_book_copies WHERE book_id = ? AND institution_id = ? AND status != 'archived'`).bind(book.id, ctx.inst.id).first();
  if (!stats.total) fail(409, 'This book is currently unavailable.');
  if (stats.avail > 0) fail(409, 'This book is available on the shelf right now — no reservation is needed.');
  const loan = await env.DB.prepare(`SELECT id FROM ins_loans WHERE book_id = ? AND borrower_type = ? AND borrower_id = ? AND status = 'borrowed'`).bind(book.id, type, borrower.id).first();
  if (loan) fail(409, 'This borrower already has this book.');
  const dup = await env.DB.prepare(`SELECT id FROM ins_reservations WHERE book_id = ? AND borrower_type = ? AND borrower_id = ? AND status IN ('waiting','ready')`).bind(book.id, type, borrower.id).first();
  if (dup) fail(409, 'There is already a reservation for this book.');
  const r = await env.DB.prepare(`INSERT INTO ins_reservations (institution_id, book_id, borrower_type, borrower_id) VALUES (?, ?, ?, ?)`).bind(ctx.inst.id, book.id, type, borrower.id).run();
  await audit(env, request, ctx, 'library', 'reservation.create', 'reservation', r.meta.last_row_id, `${book.title} for ${borrower.full_name}`);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});

export const cancelReservation = secure(async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare(`SELECT * FROM ins_reservations WHERE id = ? AND institution_id = ? AND status IN ('waiting','ready')`).bind(params.id, ctx.inst.id).first();
  if (!r) fail(404, 'The reservation could not be found.');
  const own = (r.borrower_type === 'student' && ctx.studentId === r.borrower_id) || (r.borrower_type === 'staff' && ctx.staffId === r.borrower_id);
  if (!can(ctx, 'loans.manage') && !own) fail(403, 'You do not have permission to perform this action.');
  await env.DB.prepare(`UPDATE ins_reservations SET status = 'cancelled' WHERE id = ?`).bind(r.id).run();
  if (r.status === 'ready' && r.copy_id) {
    await env.DB.prepare(`UPDATE ins_book_copies SET status = 'available' WHERE id = ? AND status = 'reserved'`).bind(r.copy_id).run();
    await holdForWaiting(env, ctx, r.book_id, r.copy_id);
  }
  await audit(env, request, ctx, 'library', 'reservation.cancel', 'reservation', r.id, null);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Fines
// ---------------------------------------------------------------------
export const listFines = secure({ perm: ['fines.manage', 'loans.view'] }, async ({ env, url, ctx }) => {
  const st = url.searchParams.get('status') || 'unpaid';
  const cond = st === 'all' ? '1=1' : `f.status = '${V.oneOf(st, 'Status', ['unpaid', 'paid', 'waived'], { required: true })}'`;
  const { results } = await env.DB.prepare(
    `SELECT f.id, f.loan_id, f.borrower_type, f.borrower_id, f.reason, f.amount, f.status, f.note, f.created_at, f.settled_at,
       CASE f.borrower_type WHEN 'student' THEN (SELECT full_name FROM ins_students WHERE id = f.borrower_id) ELSE (SELECT full_name FROM ins_staff WHERE id = f.borrower_id) END AS borrower_name,
       (SELECT b.title FROM ins_loans l JOIN ins_books b ON b.id = l.book_id WHERE l.id = f.loan_id) AS title
     FROM ins_fines f WHERE f.institution_id = ? AND ${cond} ORDER BY f.id DESC LIMIT 200`).bind(ctx.inst.id).all();
  const totals = await env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN status='unpaid' THEN amount END),0) AS unpaid, COALESCE(SUM(CASE WHEN status='paid' THEN amount END),0) AS paid, COALESCE(SUM(CASE WHEN status='waived' THEN amount END),0) AS waived FROM ins_fines WHERE institution_id = ?`).bind(ctx.inst.id).first();
  return json({ fines: results, totals });
});

export const settleFine = secure({ perm: 'fines.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const status = V.oneOf(b.status, 'Action', ['paid', 'waived'], { required: true });
  const r = await env.DB.prepare(`UPDATE ins_fines SET status = ?, settled_at = datetime('now'), settled_by = ? WHERE id = ? AND institution_id = ? AND status = 'unpaid'`).bind(status, ctx.user.id, params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, 'This fine could not be found or is already settled.');
  await audit(env, request, ctx, 'library', `fine.${status}`, 'fine', Number(params.id), null);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// "My library" — a person's own loans, reservations and fines
// ---------------------------------------------------------------------
export const myLibrary = secure(async ({ env, ctx }) => {
  const type = ctx.studentId ? 'student' : ctx.staffId ? 'staff' : null;
  const id = ctx.studentId || ctx.staffId;
  if (!type) return json({ linked: false, loans: [], reservations: [], fines: [], history: [] });
  await sweep(env, ctx);
  const today = localToday(ctx.off);
  const settings = await getSettings(env, ctx.inst.id);
  const [{ results: loans }, { results: hist }, { results: resv }, { results: fines }] = await Promise.all([
    env.DB.prepare(`${LOAN_SELECT} WHERE l.institution_id = ? AND l.borrower_type = ? AND l.borrower_id = ? AND l.status = 'borrowed' ORDER BY l.due_date`).bind(ctx.inst.id, type, id).all(),
    env.DB.prepare(`${LOAN_SELECT} WHERE l.institution_id = ? AND l.borrower_type = ? AND l.borrower_id = ? AND l.status != 'borrowed' ORDER BY l.id DESC LIMIT 50`).bind(ctx.inst.id, type, id).all(),
    env.DB.prepare(`SELECT r.id, r.status, r.hold_until, r.created_at, b.title, b.author FROM ins_reservations r JOIN ins_books b ON b.id = r.book_id WHERE r.institution_id = ? AND r.borrower_type = ? AND r.borrower_id = ? AND r.status IN ('waiting','ready') ORDER BY r.id DESC`).bind(ctx.inst.id, type, id).all(),
    env.DB.prepare(`SELECT id, reason, amount, status, note, created_at FROM ins_fines WHERE institution_id = ? AND borrower_type = ? AND borrower_id = ? ORDER BY id DESC LIMIT 50`).bind(ctx.inst.id, type, id).all(),
  ]);
  return json({ linked: true, type, loans: loans.map((l) => decorateLoan(l, today, settings.fine_per_day)), history: hist, reservations: resv, fines, today });
});
