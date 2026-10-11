-- Seed one real book with the site's original storybook content, so the
-- Library page has a genuine reader on day one instead of an empty list.
INSERT OR IGNORE INTO books (title, slug, subject, description, pages, published) VALUES (
  'The Solar System Storybook',
  'solar-system-storybook',
  'science',
  'A short illustrated story about curiosity, discovery, and the solar system.',
  '[
    {"heading":"Chapter 1 — A New Discovery","text":"The sun had barely risen over the savanna when Amara found the strange, glowing stone near the acacia tree. It was smooth, cool to the touch, and pulsed faintly like a heartbeat. She had never seen anything like it in all her nine years exploring these fields with her grandfather."},
    {"heading":"Chapter 1 — A New Discovery","text":"\"Babu, look what I found!\" she called, running toward the old man sitting beneath the tree''s wide shade. He took the stone carefully, turning it over in his weathered hands, and his eyes widened with something between wonder and worry."},
    {"heading":"Chapter 2 — The Old Map","text":"That evening, Babu pulled a rolled parchment from beneath his bed — a map older than the village itself, marked with symbols Amara had never seen. \"This stone,\" he said slowly, \"belongs to a story I have been waiting to tell you.\""},
    {"heading":"Chapter 2 — The Old Map","text":"He traced a path across the map with his finger, from the baobab forest to the river bend, ending at a symbol shaped like a rising sun. \"Every twenty-one years, the brain-light appears to remind us that curiosity is the beginning of everything worth knowing.\""},
    {"heading":"Chapter 3 — Into the Forest","text":"The next morning, with her satchel packed and the stone wrapped safely in cloth, Amara set off along the path from the map. The forest was louder than she expected — birds calling, leaves rustling, and somewhere far off, the low rumble of the river."},
    {"heading":"Chapter 3 — Into the Forest","text":"She was not walking alone for long. A small, quick-footed dik-dik crossed her path and seemed to wait for her, glancing back every few steps as though it, too, knew exactly where they were going."}
  ]',
  1
);

-- ---------------------------------------------------------------------
-- Seed an initial admin so the panel is reachable after first deploy.
-- ⚠️ Change this password immediately after first login — see README.
-- Email: admin@smart21brain.com   Password: ChangeMe123!
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO users (name, email, password_hash, password_salt, role)
VALUES (
  'Admin',
  'admin@smart21brain.com',
  'b56a2e29ab00f457df5a6bfa39ceab37802761f92b4d17db54412e77ec697c5',
  '6950776b6072e0f12528aa7dd22ab261',
  'admin'
);

-- =======================================================================
-- STATIONERY OS — smart21brain Stationery Operating System
-- Multi-tenant: Business -> Branches -> Staff (role-scoped) -> everything
-- else. Apply together with schema.sql (same D1 database) — this file is
-- appended into schema.sql by the build; kept separate here for review.
-- =======================================================================

-- ---------------------------------------------------------------------
-- Businesses & branches (tenants)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_businesses (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency      TEXT NOT NULL DEFAULT 'TZS',
  phone         TEXT,
  address       TEXT,
  logo_key      TEXT,                              -- R2 object key
  receipt_note  TEXT DEFAULT 'Asante kwa kutuchagua! / Thank you for your business!',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stn_businesses_owner ON stn_businesses(owner_user_id);

CREATE TABLE IF NOT EXISTS stn_branches (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT,
  is_main     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stn_branches_business ON stn_branches(business_id);

-- Role-scoped staff membership. A user's *global* users.role (student/
-- admin/etc, from the main site) is unrelated to their role inside a
-- given stationery business.
CREATE TABLE IF NOT EXISTS stn_staff (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  branch_id   INTEGER REFERENCES stn_branches(id) ON DELETE SET NULL,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'operator',    -- owner|manager|operator|designer|accountant
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_stn_staff_business ON stn_staff(business_id);

CREATE INDEX IF NOT EXISTS idx_stn_staff_user ON stn_staff(user_id);

-- ---------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_customers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stn_customers_business ON stn_customers(business_id);

CREATE INDEX IF NOT EXISTS idx_stn_customers_phone ON stn_customers(phone);

-- ---------------------------------------------------------------------
-- Pricing system: services / products sold at the counter
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_services (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id      INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT 'Printing',
  unit             TEXT NOT NULL DEFAULT 'page',
  unit_price       REAL NOT NULL DEFAULT 0,
  cost_price       REAL NOT NULL DEFAULT 0,          -- for profit calc
  inventory_item_id INTEGER REFERENCES stn_inventory_items(id) ON DELETE SET NULL,
  deduct_qty       REAL NOT NULL DEFAULT 0,           -- stock units deducted per 1 unit sold
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stn_services_business ON stn_services(business_id);

-- ---------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_inventory_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id    INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  branch_id      INTEGER REFERENCES stn_branches(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'Paper',
  unit           TEXT NOT NULL DEFAULT 'pcs',
  quantity       REAL NOT NULL DEFAULT 0,
  reorder_level  REAL NOT NULL DEFAULT 5,
  cost_price     REAL NOT NULL DEFAULT 0,
  barcode        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stn_inventory_business ON stn_inventory_items(business_id);

CREATE INDEX IF NOT EXISTS idx_stn_inventory_barcode ON stn_inventory_items(barcode);

CREATE TABLE IF NOT EXISTS stn_stock_movements (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id  INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  item_id      INTEGER NOT NULL REFERENCES stn_inventory_items(id) ON DELETE CASCADE,
  change_qty   REAL NOT NULL,                        -- negative = deduction
  reason       TEXT NOT NULL DEFAULT 'adjustment',    -- sale|purchase|adjustment|waste
  ref_order_id INTEGER,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stn_stock_moves_item ON stn_stock_movements(item_id);

CREATE INDEX IF NOT EXISTS idx_stn_stock_moves_business ON stn_stock_movements(business_id);

-- ---------------------------------------------------------------------
-- Universal Order Engine
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id    INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  branch_id      INTEGER REFERENCES stn_branches(id) ON DELETE SET NULL,
  order_no       TEXT NOT NULL,
  customer_id    INTEGER REFERENCES stn_customers(id) ON DELETE SET NULL,
  operator_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'Received',   -- Received|Processing|Ready|Completed|Cancelled
  payment_status TEXT NOT NULL DEFAULT 'Unpaid',     -- Unpaid|Partial|Paid
  payment_method TEXT,                                -- mpesa|tigopesa|cash|bank|credit
  subtotal       REAL NOT NULL DEFAULT 0,
  discount       REAL NOT NULL DEFAULT 0,
  total_amount   REAL NOT NULL DEFAULT 0,
  paid_amount    REAL NOT NULL DEFAULT 0,
  notes          TEXT,
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(business_id, order_no)
);

CREATE INDEX IF NOT EXISTS idx_stn_orders_business ON stn_orders(business_id, created_at);

CREATE INDEX IF NOT EXISTS idx_stn_orders_status ON stn_orders(business_id, status);

CREATE INDEX IF NOT EXISTS idx_stn_orders_customer ON stn_orders(customer_id);

CREATE TABLE IF NOT EXISTS stn_order_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL REFERENCES stn_orders(id) ON DELETE CASCADE,
  service_id  INTEGER REFERENCES stn_services(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  qty         REAL NOT NULL DEFAULT 1,
  unit_price  REAL NOT NULL DEFAULT 0,
  total_price REAL NOT NULL DEFAULT 0,
  file_key    TEXT                                    -- optional R2 object key (uploaded job file)
);

CREATE INDEX IF NOT EXISTS idx_stn_order_items_order ON stn_order_items(order_id);

CREATE TABLE IF NOT EXISTS stn_payments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  order_id    INTEGER NOT NULL REFERENCES stn_orders(id) ON DELETE CASCADE,
  amount      REAL NOT NULL,
  method      TEXT NOT NULL DEFAULT 'cash',           -- mpesa|tigopesa|cash|bank|credit
  reference   TEXT,
  received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stn_payments_business ON stn_payments(business_id, created_at);

CREATE INDEX IF NOT EXISTS idx_stn_payments_order ON stn_payments(order_id);

-- ---------------------------------------------------------------------
-- Finance: expenses & cashbook derive from payments + expenses
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_expenses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  branch_id   INTEGER REFERENCES stn_branches(id) ON DELETE SET NULL,
  category    TEXT NOT NULL DEFAULT 'General',
  description TEXT,
  amount      REAL NOT NULL,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
