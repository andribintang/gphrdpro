-- ═══════════════════════════════════════════════════════════════
-- Migration: Fix erp_stock created_at/updated_at missing default
-- ═══════════════════════════════════════════════════════════════
-- Root cause: kolom created_at/updated_at di tabel erp_stock NOT NULL
-- tanpa DEFAULT value. Model Sequelize-nya (timestamps:false) tidak
-- otomatis isi kolom ini, sehingga setiap Stock.create() yang lupa
-- pass created_at/updated_at manual akan gagal dengan error:
--   "Field 'created_at' doesn't have a default value"
--
-- Migration ini menambahkan DEFAULT CURRENT_TIMESTAMP sebagai jaring
-- pengaman tingkat database — supaya kode yang lupa isi timestamp
-- manual TIDAK AKAN crash lagi di masa depan.
--
-- AMAN dijalankan berkali-kali (MODIFY COLUMN bukan ADD COLUMN,
-- tidak akan error walau sudah pernah dijalankan sebelumnya).
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE erp_stock
  MODIFY COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE erp_stock
  MODIFY COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
