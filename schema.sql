CREATE TABLE IF NOT EXISTS products (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 category TEXT NOT NULL,
 price REAL NOT NULL,
 image TEXT DEFAULT '',
 active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS settings (
 key TEXT PRIMARY KEY,
 value TEXT NOT NULL
);
INSERT OR IGNORE INTO settings(key,value) VALUES
 ('store_name','StoreRi7a'),('whatsapp','212600000000'),('currency','DH');
INSERT INTO products(name,category,price,image) SELECT 'Rose Élégance','عطور نسائية',199,'🌸'
WHERE NOT EXISTS(SELECT 1 FROM products);
INSERT INTO products(name,category,price,image) SELECT 'Musk Night','عطور رجالية',229,'🖤'
WHERE (SELECT COUNT(*) FROM products)=1;
INSERT INTO products(name,category,price,image) SELECT 'Rouge Lipstick','تجميل',79,'💄'
WHERE (SELECT COUNT(*) FROM products)=2;
