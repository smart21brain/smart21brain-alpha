-- Smart21Shop — D1 schema
--
-- Apply on top of schema.sql (it re-uses the `users` and `sessions` tables):
--   wrangler d1 execute smart21brain-db --file=./shop-schema.sql --remote
--
-- One database serves MANY shops. Every table below (except the two at the
-- very bottom) carries a shop_id, and every query in src/handlers/shop/*
-- is filtered by it, so one shop can never see another shop's data.
-- Safe to run more than once (everything is CREATE ... IF NOT EXISTS).

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- Shops, members, roles & permissions, settings
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shp_shops (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  short_name     TEXT NOT NULL,
  logo_key       TEXT,                          -- R2 key (MATERIALS bucket)
  phone          TEXT,
  email          TEXT,
  address        TEXT,
  website        TEXT,
  tax_no         TEXT,                          -- TIN / VAT number printed on receipts
  currency       TEXT NOT NULL DEFAULT 'TZS',
  primary_color  TEXT NOT NULL DEFAULT '#4F46E5',
  tax_rate       REAL NOT NULL DEFAULT 0,       -- VAT % added to every sale (0 = no tax)
  utc_offset_min INTEGER NOT NULL DEFAULT 180,  -- shop time zone, minutes from UTC (180 = East Africa)
  receipt_note   TEXT,
  owner_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A signed-in smart21brain account can belong to several shops; the role is per shop.
CREATE TABLE IF NOT EXISTS shp_members (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id    INTEGER NOT NULL REFERENCES shp_shops(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('owner','manager','cashier')),
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (shop_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_shp_members_user ON shp_members(user_id);

-- Each shop can change what each role is allowed to do (Settings -> Roles).
CREATE TABLE IF NOT EXISTS shp_role_permissions (
  shop_id    INTEGER NOT NULL REFERENCES shp_shops(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (shop_id, role, permission)
);

-- Free-form per-shop settings (payment methods, receipt footer, prefixes…)
CREATE TABLE IF NOT EXISTS shp_settings (
  shop_id INTEGER NOT NULL REFERENCES shp_shops(id) ON DELETE CASCADE,
  key     TEXT NOT NULL,
  value   TEXT,
  PRIMARY KEY (shop_id, key)
);

-- ---------------------------------------------------------------------
-- Customers (the heart of the system: every sale can be saved to one)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shp_customers (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id        INTEGER NOT NULL REFERENCES shp_shops(id) ON DELETE CASCADE,
  seq            INTEGER NOT NULL,
  customer_no    TEXT NOT NULL,                 -- e.g. C-0001
  full_name      TEXT NOT NULL,
  phone          TEXT,
  alt_phone      TEXT,
  email          TEXT,
  address        TEXT,
  city           TEXT,
  company        TEXT,
  customer_type  TEXT NOT NULL DEFAULT 'retail' CHECK (customer_type IN ('retail','wholesale','vip')),
  gender         TEXT CHECK (gender IN ('male','female') OR gender IS NULL),
  birthday       TEXT,
  credit_limit   REAL NOT NULL DEFAULT 0,       -- 0 = no limit
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  notes          TEXT,
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (shop_id, seq),
  UNIQUE (shop_id, customer_no)
);
CREATE INDEX IF NOT EXISTS idx_shp_customers_name  ON shp_customers(shop_id, full_name);
CREATE INDEX IF NOT EXISTS idx_shp_customers_phone ON shp_customers(shop_id, phone);

CREATE TABLE IF NOT EXISTS shp_customer_notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id     INTEGER NOT NULL REFERENCES shp_shops(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES shp_customers(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  note        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shp_cnotes_customer ON shp_customer_notes(customer_id);

-- ---------------------------------------------------------------------
-- Products, categories, stock
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shp_categories (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER NOT NULL REFERENCES shp_shops(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  color   TEXT,
  UNIQUE (shop_id, name)
);

CREATE TABLE IF NOT EXISTS shp_products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id       INTEGER NOT NULL REFERENCES shp_shops(id) ON DELETE CASCADE,
  category_id   INTEGER REFERENCES shp_categories(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  sku           TEXT,
  barcode       TEXT,
  unit          TEXT NOT NULL DEFAULT 'pcs',
  cost_price    REAL NOT NULL DEFAULT 0,
  sell_price    REAL NOT NULL DEFAULT 0,
  stock_qty     REAL NOT NULL DEFAULT 0,
  reorder_level REAL NOT NULL DEFAULT 0,        -- warn when stock falls to this level
  track_stock   INTEGER NOT NULL DEFAULT 1,     -- 0 = a service / non-stock item
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  description   TEXT,
  image_key     TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shp_products_shop     ON shp_products(shop_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shp_products_sku     ON shp_products(shop_id, sku);
CREATE INDEX IF NOT EXISTS idx_shp_products_barcode  ON shp_products(shop_id, barcode);

CREATE TABLE IF NOT EXISTS shp_stock_moves (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id       INTEGER NOT NULL REFERENCES shp_shops(id) ON DELETE CASCADE,
  product_id    INTEGER NOT NULL REFERENCES shp_products(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('opening','purchase','sale','adjust','return','void','damage')),
  qty_change    REAL NOT NULL,
  balance_after REAL NOT NULL,
  note          TEXT,
  sale_id       INTEGER,
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shp_moves_product ON shp_stock_moves(product_id, id);

-- ---------------------------------------------------------------------
-- Sales, items, payments
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shp_sales (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id        INTEGER NOT NULL REFERENCES shp_shops(id) ON DELETE CASCADE,
  seq            INTEGER NOT NULL,
  receipt_no     TEXT NOT NULL,                 -- e.g. RCT-000123
  customer_id    INTEGER REFERENCES shp_customers(id) ON DELETE SET NULL,
  customer_name  TEXT,                          -- snapshot (or "Walk-in customer")
  customer_phone TEXT,
  subtotal       REAL NOT NULL DEFAULT 0,
  discount       REAL NOT NULL DEFAULT 0,
  tax            REAL NOT NULL DEFAULT 0,
  total          REAL NOT NULL DEFAULT 0,
  paid           REAL NOT NULL DEFAULT 0,
  balance        REAL NOT NULL DEFAULT 0,       -- still owed by the customer
  cost_total     REAL NOT NULL DEFAULT 0,       -- what the goods cost (for profit)
  payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid','partial','unpaid')),
  status         TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','void')),
  due_date       TEXT,
  note           TEXT,
  void_reason    TEXT,
  voided_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  voided_at      TEXT,
  sold_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (shop_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_shp_sales_shop_date ON shp_sales(shop_id, created_at);
CREATE INDEX IF NOT EXISTS idx_shp_sales_customer  ON shp_sales(customer_id);

CREATE TABLE IF NOT EXISTS shp_sale_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id    INTEGER NOT NULL REFERENCES shp_shops(id) ON DELETE CASCADE,
  sale_id    INTEGER NOT NULL REFERENCES shp_sales(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES shp_products(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  unit       TEXT,
  qty        REAL NOT NULL,
  unit_price REAL NOT NULL,
  cost_price REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shp_items_sale    ON shp_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_shp_items_product ON shp_sale_items(product_id);

CREATE TABLE IF NOT EXISTS shp_payments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id     INTEGER NOT NULL REFERENCES shp_shops(id) ON DELETE CASCADE,
  sale_id     INTEGER NOT NULL REFERENCES shp_sales(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES shp_customers(id) ON DELETE SET NULL,
  amount      REAL NOT NULL,
  method      TEXT NOT NULL,
  reference   TEXT,
  note        TEXT,
  received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shp_payments_sale ON shp_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_shp_payments_date ON shp_payments(shop_id, created_at);

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
