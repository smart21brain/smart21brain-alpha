-- Use this INSTEAD of phase9-book-pdf.sql when your database has no "books" table yet
-- (error: "no such table: books").
-- Safe to run more than once. Never deletes anything.
--   npx wrangler d1 execute smart21brain-db --remote --file=./migrations/phase9-books-create.sql
CREATE TABLE IF NOT EXISTS books (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  subject     TEXT,
  description TEXT,
  cover_url   TEXT,
  pages       TEXT NOT NULL,
  published   INTEGER NOT NULL DEFAULT 1,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  pdf_key     TEXT,
  cover_key   TEXT,
  pdf_pages   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS book_progress (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page        INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, book_id)
);
