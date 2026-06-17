const { sequelize } = require('../config/database');
const https = require('https');

const BACKUP_SECRET = process.env.BACKUP_SECRET || 'BACKUP-GPDISTRO-2024';
const CLOUD_NAME    = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUD_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUD_SECRET  = process.env.CLOUDINARY_API_SECRET;
const MAX_BACKUPS   = 30;

// ── Upload JSON to Cloudinary as raw file ────────────────────
const uploadToCloudinary = async (jsonStr, filename) => {
  if (!CLOUD_NAME || !CLOUD_API_KEY || !CLOUD_SECRET)
    throw new Error('Cloudinary env belum dikonfigurasi');

  const crypto = require('crypto');
  const FormData = require('form-data');
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId  = `backups-erp/${filename}`;

  const sigStr = `public_id=${publicId}&timestamp=${timestamp}${CLOUD_SECRET}`;
  const signature = crypto.createHash('sha1').update(sigStr).digest('hex');

  const form = new FormData();
  form.append('file',      Buffer.from(jsonStr, 'utf-8'), { filename: filename + '.json', contentType: 'application/json' });
  form.append('api_key',   CLOUD_API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('public_id', publicId);
  form.append('signature', signature);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUD_NAME}/raw/upload`,
      method: 'POST',
      headers: form.getHeaders(),
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.secure_url) resolve(parsed.secure_url);
        else reject(new Error(parsed.error?.message || 'Upload failed'));
      });
    });
    req.on('error', reject);
    form.pipe(req);
  });
};

// ── Tables to backup — semua data ERP + Toko Online ───────────
const BACKUP_TABLES = [
  'erp_sub_channels','erp_categories','erp_products','erp_stock','erp_stock_movements',
  'erp_customers','erp_orders','erp_order_items','erp_payments','erp_shipments',
  'erp_returns','erp_return_items','erp_import_logs','erp_channel_targets',
  'store_config','store_categories','store_products','store_banners',
  'store_customers','store_addresses','store_carts','store_vouchers',
  'store_orders','store_order_items','store_payments','store_reviews',
];

// ── Run backup ────────────────────────────────────────────────
const runBackup = async (triggeredBy = 'manual') => {
  const now      = new Date();
  const filename = `backup_erp_${now.toISOString().replace(/[:.]/g,'-').slice(0,19)}`;
  const data     = { meta: { created_at: now.toISOString(), triggered_by: triggeredBy, version: '1.0', module: 'erp' }, tables: {} };

  for (const tbl of BACKUP_TABLES) {
    try {
      const [rows] = await sequelize.query(`SELECT * FROM ${tbl}`);
      data.tables[tbl] = rows;
    } catch { data.tables[tbl] = []; }
  }

  const totalRows = Object.values(data.tables).reduce((s, r) => s + r.length, 0);
  const jsonStr   = JSON.stringify(data, null, 0);
  const sizeKB    = Math.round(Buffer.byteLength(jsonStr) / 1024);

  const url = await uploadToCloudinary(jsonStr, filename);

  await sequelize.query(`
    INSERT INTO backup_erp_logs (filename, url, size_kb, total_rows, triggered_by, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'success', NOW())
  `, { replacements: [filename, url, sizeKB, totalRows, triggeredBy] });

  const [logs] = await sequelize.query(`SELECT id FROM backup_erp_logs ORDER BY created_at DESC`);
  if (logs.length > MAX_BACKUPS) {
    const toDelete = logs.slice(MAX_BACKUPS).map(l => l.id);
    await sequelize.query(`DELETE FROM backup_erp_logs WHERE id IN (${toDelete.join(',')})`);
  }

  return { filename, url, sizeKB, totalRows };
};

// ── GET /api/backup-erp ────────────────────────────────────────
const getBackups = async (req, res, next) => {
  try {
    const [logs] = await sequelize.query(`SELECT * FROM backup_erp_logs ORDER BY created_at DESC LIMIT 50`);
    const [[{cnt}]] = await sequelize.query(`SELECT COUNT(*) AS cnt FROM backup_erp_logs`);
    return res.json({ success: true, data: { backups: logs, total: parseInt(cnt) } });
  } catch(err) { next(err); }
};

// ── POST /api/backup-erp/run ───────────────────────────────────
const createBackup = async (req, res, next) => {
  try {
    const result = await runBackup('manual');
    return res.json({ success: true, message: `Backup ERP berhasil — ${result.sizeKB} KB, ${result.totalRows} rows`, data: result });
  } catch(err) {
    try {
      await sequelize.query(
        `INSERT INTO backup_erp_logs (filename, url, size_kb, total_rows, triggered_by, status, error, created_at)
         VALUES (?, '', 0, 0, 'manual', 'failed', ?, NOW())`,
        { replacements: [`backup_erp_failed_${Date.now()}`, err.message] }
      );
    } catch {}
    next(err);
  }
};

// ── POST /api/backup-erp/restore ───────────────────────────────
const restoreBackup = async (req, res, next) => {
  const secret = req.headers['x-backup-secret'] || req.body.secret;
  if (secret !== BACKUP_SECRET)
    return res.status(403).json({ success: false, message: 'Secret tidak valid' });

  try {
    const { url, tables: selectedTables } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'URL backup wajib' });

    const jsonStr = await new Promise((resolve, reject) => {
      https.get(url, (r) => {
        let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(d));
      }).on('error', reject);
    });

    const backup = JSON.parse(jsonStr);
    if (!backup.tables) return res.status(400).json({ success: false, message: 'Format backup tidak valid' });

    const tablesToRestore = selectedTables?.length ? selectedTables : Object.keys(backup.tables);

    const results = {};
    const t = await sequelize.transaction();
    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS=0', { transaction: t });
      for (const tbl of tablesToRestore) {
        const rows = backup.tables[tbl];
        if (!rows?.length) { results[tbl] = 0; continue; }

        const cols   = Object.keys(rows[0]);
        const colStr = cols.map(c => `\`${c}\``).join(',');
        const phStr  = cols.map(() => '?').join(',');
        const updStr = cols.filter(c => c !== 'id').map(c => `\`${c}\`=VALUES(\`${c}\`)`).join(',');

        let count = 0;
        for (const row of rows) {
          await sequelize.query(
            `INSERT INTO ${tbl} (${colStr}) VALUES (${phStr}) ON DUPLICATE KEY UPDATE ${updStr}`,
            { replacements: cols.map(c => row[c] ?? null), transaction: t }
          );
          count++;
        }
        results[tbl] = count;
      }
      await sequelize.query('SET FOREIGN_KEY_CHECKS=1', { transaction: t });
      await t.commit();
    } catch(e) {
      await t.rollback();
      throw e;
    }

    const totalRestored = Object.values(results).reduce((s,v) => s + v, 0);
    return res.json({
      success: true,
      message: `Restore ERP berhasil — ${totalRestored} rows dari ${Object.keys(results).length} tabel`,
      data: { results, total_restored: totalRestored },
    });
  } catch(err) { next(err); }
};

// ── GET /api/backup-erp/schedule ───────────────────────────────
const getSchedule = async (req, res, next) => {
  try {
    const [[sched]] = await sequelize.query(`SELECT * FROM backup_erp_schedule LIMIT 1`);
    return res.json({ success: true, data: { schedule: sched || null } });
  } catch(err) { next(err); }
};

// ── PUT /api/backup-erp/schedule ───────────────────────────────
const updateSchedule = async (req, res, next) => {
  try {
    const { frequency, hour = 3, enabled = true } = req.body;
    if (!['daily','weekly','monthly'].includes(frequency))
      return res.status(400).json({ success: false, message: 'Frequency harus daily/weekly/monthly' });

    const [[existing]] = await sequelize.query(`SELECT id FROM backup_erp_schedule LIMIT 1`);
    if (existing) {
      await sequelize.query(
        `UPDATE backup_erp_schedule SET frequency=?, hour=?, enabled=?, updated_at=NOW() WHERE id=?`,
        { replacements: [frequency, hour, enabled?1:0, existing.id] }
      );
    } else {
      await sequelize.query(
        `INSERT INTO backup_erp_schedule (frequency, hour, enabled, created_at, updated_at) VALUES (?,?,?,NOW(),NOW())`,
        { replacements: [frequency, hour, enabled?1:0] }
      );
    }

    const { restartErpCron } = require('../services/backupErpCron');
    restartErpCron();

    return res.json({ success: true, message: 'Jadwal backup ERP disimpan' });
  } catch(err) { next(err); }
};

// ── DELETE /api/backup-erp/:id ─────────────────────────────────
const deleteBackup = async (req, res, next) => {
  try {
    await sequelize.query(`DELETE FROM backup_erp_logs WHERE id = ?`, { replacements: [req.params.id] });
    return res.json({ success: true, message: 'Backup dihapus dari log' });
  } catch(err) { next(err); }
};

module.exports = { getBackups, createBackup, restoreBackup, getSchedule, updateSchedule, deleteBackup, runBackup };
