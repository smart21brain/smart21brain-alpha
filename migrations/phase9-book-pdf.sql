-- Phase 9: PDF books (upload a PDF + cover image from the admin dashboard)
-- Run once on an existing database:
--   wrangler d1 execute smart21brain-db --remote --file=./migrations/phase9-book-pdf.sql
-- (If it says "duplicate column name", the columns already exist; that's fine.)
ALTER TABLE books ADD COLUMN pdf_key   TEXT;
ALTER TABLE books ADD COLUMN cover_key TEXT;
ALTER TABLE books ADD COLUMN pdf_pages INTEGER NOT NULL DEFAULT 0;
