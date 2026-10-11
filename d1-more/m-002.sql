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
