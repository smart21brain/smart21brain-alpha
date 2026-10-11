CREATE TABLE IF NOT EXISTS ins_books (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id     INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  isbn               TEXT,
  title              TEXT NOT NULL,
  author             TEXT NOT NULL,
  publisher          TEXT,
  pub_year           INTEGER,
  edition            TEXT,
  category_id        INTEGER REFERENCES ins_categories(id) ON DELETE SET NULL,
  subject            TEXT,
  language           TEXT,
  description        TEXT,
  shelf              TEXT,                       -- shelf / location
  classification_no  TEXT,                       -- Dewey / call number
  cover_key          TEXT,                       -- R2 key
  acquisition_date   TEXT,
  acquisition_source TEXT,
  price              REAL,
  notes              TEXT,
  archived           INTEGER NOT NULL DEFAULT 0,
  deleted_at         TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ins_books_title  ON ins_books(institution_id, title);

CREATE INDEX IF NOT EXISTS idx_ins_books_author ON ins_books(institution_id, author);

CREATE INDEX IF NOT EXISTS idx_ins_books_isbn   ON ins_books(institution_id, isbn);

CREATE INDEX IF NOT EXISTS idx_ins_books_cat    ON ins_books(institution_id, category_id);

-- One row per physical copy; availability is always derived from these rows.
CREATE TABLE IF NOT EXISTS ins_book_copies (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  book_id        INTEGER NOT NULL REFERENCES ins_books(id) ON DELETE CASCADE,
  accession_no   TEXT NOT NULL,
  barcode        TEXT,
  status         TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','borrowed','reserved','lost','damaged','archived')),
  note           TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (institution_id, accession_no)
);

CREATE INDEX IF NOT EXISTS idx_ins_copies_book    ON ins_book_copies(book_id, status);

CREATE INDEX IF NOT EXISTS idx_ins_copies_barcode ON ins_book_copies(institution_id, barcode);

CREATE TABLE IF NOT EXISTS ins_loans (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id    INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  copy_id           INTEGER NOT NULL REFERENCES ins_book_copies(id) ON DELETE CASCADE,
  book_id           INTEGER NOT NULL REFERENCES ins_books(id) ON DELETE CASCADE,
  borrower_type     TEXT NOT NULL CHECK (borrower_type IN ('student','staff')),
  borrower_id       INTEGER NOT NULL,
  issued_on         TEXT NOT NULL,                -- local calendar date, YYYY-MM-DD
  due_date          TEXT NOT NULL,
  returned_on       TEXT,
  renewals          INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'borrowed' CHECK (status IN ('borrowed','returned','lost')),
  return_condition  TEXT CHECK (return_condition IN ('good','damaged','lost')),
  issued_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  returned_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  overdue_notified_on TEXT,
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ins_loans_status   ON ins_loans(institution_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_ins_loans_borrower ON ins_loans(institution_id, borrower_type, borrower_id);

CREATE INDEX IF NOT EXISTS idx_ins_loans_book     ON ins_loans(book_id);

CREATE INDEX IF NOT EXISTS idx_ins_loans_copy     ON ins_loans(copy_id, status);

CREATE TABLE IF NOT EXISTS ins_reservations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  book_id        INTEGER NOT NULL REFERENCES ins_books(id) ON DELETE CASCADE,
  borrower_type  TEXT NOT NULL CHECK (borrower_type IN ('student','staff')),
  borrower_id    INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','ready','fulfilled','cancelled','expired')),
  copy_id        INTEGER REFERENCES ins_book_copies(id) ON DELETE SET NULL,   -- the copy held once status = ready
  hold_until     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ins_resv_book     ON ins_reservations(institution_id, book_id, status);

CREATE INDEX IF NOT EXISTS idx_ins_resv_borrower ON ins_reservations(institution_id, borrower_type, borrower_id);
