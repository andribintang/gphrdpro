-- ════════════════════════════════════════════════════════════════════
-- GPDISTRO RACING ID — Customer Module Upgrade Migration
-- ════════════════════════════════════════════════════════════════════
-- ⚠️  FILE INI ADALAH FALLBACK — JANGAN DIJALANKAN PERTAMA.
--
-- Cara migrasi utama: POST https://backend-gphrdpro.up.railway.app/run-alter
-- via Postman dengan header x-migrate-secret: hrd2024migrateNow!
--
-- Jalankan SQL ini HANYA jika setelah /run-alter, perintah:
--    DESCRIBE erp_customers;
-- masih belum menampilkan kolom-kolom baru (tags, source, birthday,
-- province_code, city_code, district, district_code, village, village_code).
-- ════════════════════════════════════════════════════════════════════
-- Tambahkan kolom baru ke tabel erp_customers untuk:
-- - Tag/Label (VIP, Reseller, dll)
-- - Source tracking (WA, IG, Marketplace, Walk-in, Referral)
-- - Birthday
-- - Cascade Wilayah Indonesia (province/city/district/village + codes)
-- ════════════════════════════════════════════════════════════════════

-- Jalankan di Railway DB console. Pakai MySQL 8.0.29+ (Railway default).
-- Aman dijalankan berulang kali — pakai IF NOT EXISTS.

ALTER TABLE erp_customers
  ADD COLUMN IF NOT EXISTS tags          TEXT          NULL                          AFTER notes,
  ADD COLUMN IF NOT EXISTS source        VARCHAR(50)   NULL                          AFTER tags,
  ADD COLUMN IF NOT EXISTS birthday      DATE          NULL                          AFTER source,
  ADD COLUMN IF NOT EXISTS province_code VARCHAR(10)   NULL                          AFTER province,
  ADD COLUMN IF NOT EXISTS city_code     VARCHAR(10)   NULL                          AFTER city,
  ADD COLUMN IF NOT EXISTS district      VARCHAR(100)  NULL                          AFTER city_code,
  ADD COLUMN IF NOT EXISTS district_code VARCHAR(10)   NULL                          AFTER district,
  ADD COLUMN IF NOT EXISTS village       VARCHAR(100)  NULL                          AFTER district_code,
  ADD COLUMN IF NOT EXISTS village_code  VARCHAR(10)   NULL                          AFTER village;

-- Index untuk performa filter/search
CREATE INDEX IF NOT EXISTS idx_erp_customers_province ON erp_customers (province_code);
CREATE INDEX IF NOT EXISTS idx_erp_customers_city     ON erp_customers (city_code);
CREATE INDEX IF NOT EXISTS idx_erp_customers_source   ON erp_customers (source);
CREATE INDEX IF NOT EXISTS idx_erp_customers_phone    ON erp_customers (phone);

-- Verifikasi struktur akhir
-- DESCRIBE erp_customers;
