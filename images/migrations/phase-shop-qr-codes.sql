-- Adds QR tags to an ALREADY-DEPLOYED Smart21Shop database.
-- New installs don't need this file — it's already included in shop-schema.sql.
--   wrangler d1 execute smart21brain-db --file=./migrations/phase-shop-qr-codes.sql --remote
--
-- One unique QR code per physical item. Scanning a tag says whether THAT
-- item is still on the shelf or has already been sold (and on which receipt).
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
