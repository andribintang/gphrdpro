-- ════════════════════════════════════════════════════════════════════
-- GPDISTRO RACING ID — Product Variants Phase 1 Migration
-- ════════════════════════════════════════════════════════════════════
-- Cara migrasi utama: POST /run-alter via Postman (jika handler /run-alter
-- sudah di-update di server.js untuk include ini).
--
-- Jika handler /run-alter belum di-update (kemungkinan besar belum, karena
-- handler-nya hardcoded list), JALANKAN SQL INI LANGSUNG di Railway DB
-- console sebagai cara migrasi utama untuk Phase 1.
-- ════════════════════════════════════════════════════════════════════

-- 1) Tabel utama varian (1 row = 1 kombinasi unik per produk)
CREATE TABLE IF NOT EXISTS erp_product_variants (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  product_id           INT          NOT NULL,
  name                 VARCHAR(150) NOT NULL COMMENT 'Auto-generated: "Merah / L"',
  sku                  VARCHAR(50)  NULL,
  barcode              VARCHAR(100) NULL,
  attributes           JSON         NULL COMMENT '{"Warna":"Merah","Ukuran":"L"}',
  price_override       DECIMAL(15,2) NULL COMMENT 'Override sell_price; NULL = pakai harga produk',
  buy_price_override   DECIMAL(15,2) NULL,
  weight_override      DECIMAL(8,2)  NULL,
  stock_min            INT          DEFAULT 0,
  is_active            BOOLEAN      DEFAULT TRUE,
  sort_order           INT          DEFAULT 0,
  image_url            TEXT         NULL,
  notes                TEXT         NULL,
  created_at           DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_product (product_id),
  KEY idx_sku (sku),
  KEY idx_active (product_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Stock per cabang per varian
ALTER TABLE erp_stock
  ADD COLUMN IF NOT EXISTS variant_id INT NULL AFTER product_id;

CREATE INDEX IF NOT EXISTS idx_stock_variant      ON erp_stock (variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_lookup       ON erp_stock (product_id, variant_id, branch_id);

-- 3) Stock movement
ALTER TABLE erp_stock_movements
  ADD COLUMN IF NOT EXISTS variant_id INT NULL AFTER product_id;

CREATE INDEX IF NOT EXISTS idx_movement_variant ON erp_stock_movements (variant_id);

-- 4) Order item — track variant yang dipesan (untuk Phase 2)
ALTER TABLE erp_order_items
  ADD COLUMN IF NOT EXISTS variant_id    INT          NULL AFTER product_id,
  ADD COLUMN IF NOT EXISTS variant_name  VARCHAR(150) NULL AFTER variant_id;

CREATE INDEX IF NOT EXISTS idx_orderitem_variant ON erp_order_items (variant_id);

-- 5) Verifikasi
-- SELECT * FROM erp_product_variants LIMIT 1;
-- DESCRIBE erp_product_variants;
-- DESCRIBE erp_stock;
-- DESCRIBE erp_stock_movements;
-- DESCRIBE erp_order_items;
