-- =====================================================
-- StoreRi7a - Full Database Schema
-- Replace the old schema.sql with this file
-- =====================================================

PRAGMA foreign_keys = ON;

-- =====================================================
-- PRODUCTS
-- =====================================================

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,

  image TEXT DEFAULT '',
  images TEXT DEFAULT '[]',

  sale_price REAL,
  discount REAL DEFAULT 0,

  description TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  size TEXT DEFAULT '',

  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category
ON products(category);

CREATE INDEX IF NOT EXISTS idx_products_active
ON products(active);

CREATE INDEX IF NOT EXISTS idx_products_created_at
ON products(created_at);


-- =====================================================
-- SETTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings(key,value) VALUES
  ('store_name','StoreRi7a'),
  ('whatsapp','212600000000'),
  ('currency','DH');


-- =====================================================
-- ORDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,

  total REAL NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'new',

  notes TEXT DEFAULT '',

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
ON orders(created_at);

CREATE INDEX IF NOT EXISTS idx_orders_customer_phone
ON orders(customer_phone);


-- =====================================================
-- ORDER ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  order_id INTEGER NOT NULL,
  product_id INTEGER,

  product_name TEXT NOT NULL,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,

  FOREIGN KEY(order_id)
    REFERENCES orders(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id
ON order_items(product_id);


-- =====================================================
-- OPTIONAL SAMPLE PRODUCTS
-- Only inserted when products table is empty
-- =====================================================

INSERT INTO products(
  name,
  category,
  price,
  image,
  active
)
SELECT
  'Rose Élégance',
  'عطور نسائية',
  199,
  '🌸',
  1
WHERE NOT EXISTS(
  SELECT 1 FROM products
);

INSERT INTO products(
  name,
  category,
  price,
  image,
  active
)
SELECT
  'Musk Night',
  'عطور رجالية',
  229,
  '🖤',
  1
WHERE (SELECT COUNT(*) FROM products)=1;

INSERT INTO products(
  name,
  category,
  price,
  image,
  active
)
SELECT
  'Rouge Lipstick',
  'تجميل',
  79,
  '💄',
  1
WHERE (SELECT COUNT(*) FROM products)=2;
