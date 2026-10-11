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
