-- ---------------------------------------------------------------------
-- QR tags — one unique QR code per physical item
--
-- A product can have any number of tags. Scanning a tag tells you whether
-- THAT item is still on the shelf or has already been sold (and on which
-- receipt). Tags are optional: products without tags sell exactly as before.
--   in_stock = printed / on the shelf     sold = went out on sale_id
--   disabled = lost, damaged or withdrawn (cannot be sold)
-- Cancelling a sale puts its tags back to in_stock.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shp_qr_codes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id    INTEGER NOT NULL REFERENCES shp_shops(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES shp_products(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,                     -- random 12-character code inside the QR link
  serial     INTEGER NOT NULL,                  -- 1, 2, 3 … per product (printed as #0001)
  status     TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock','sold','disabled')),
  sale_id    INTEGER REFERENCES shp_sales(id) ON DELETE SET NULL,
  sold_at    TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (code),
  UNIQUE (product_id, serial)
);

CREATE INDEX IF NOT EXISTS idx_shp_qr_product ON shp_qr_codes(product_id, status);

CREATE INDEX IF NOT EXISTS idx_shp_qr_sale    ON shp_qr_codes(sale_id);

-- ---------------------------------------------------------------------
-- Expenses
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shp_expenses (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id      INTEGER NOT NULL REFERENCES shp_shops(id) ON DELETE CASCADE,
  category     TEXT NOT NULL,
  description  TEXT,
  amount       REAL NOT NULL,
  expense_date TEXT NOT NULL,
  method       TEXT,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shp_expenses_date ON shp_expenses(shop_id, expense_date);

-- ---------------------------------------------------------------------
-- Audit trail and sign-in throttling
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shp_audit_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id    INTEGER NOT NULL REFERENCES shp_shops(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  entity     TEXT,
  entity_id  INTEGER,
  details    TEXT,
  ip         TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shp_audit_shop ON shp_audit_logs(shop_id, id DESC);

CREATE TABLE IF NOT EXISTS shp_login_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT,
  ip         TEXT,
  success    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shp_attempts_email ON shp_login_attempts(email, created_at);

CREATE INDEX IF NOT EXISTS idx_shp_attempts_ip    ON shp_login_attempts(ip, created_at);

-- ---------------------------------------------------------------------
-- Schools, members, roles & permissions, settings
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sch_schools (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  short_name       TEXT NOT NULL,
  logo_key         TEXT,                          -- R2 key (MATERIALS bucket)
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  website          TEXT,
  social           TEXT,                          -- JSON: {facebook, instagram, x, youtube, tiktok}
  currency         TEXT NOT NULL DEFAULT 'TZS',
  admission_prefix TEXT NOT NULL,                 -- e.g. "S21" -> S21-2026-0001
  primary_color    TEXT NOT NULL DEFAULT '#0B6E4F',
  receipt_note     TEXT,
  owner_user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A signed-in smart21brain account can belong to several schools; the role
-- is per school. teacher_id / parent_id link a login to the teacher or
-- parent record (used to scope what a teacher / parent may see).
CREATE TABLE IF NOT EXISTS sch_members (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id  INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('admin','teacher','receptionist','parent')),
  teacher_id INTEGER,
  parent_id  INTEGER,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (school_id, user_id)
);
