const cron = require('node-cron');
const { sequelize } = require('../config/database');
const { runBackup } = require('../controllers/backupErpController');

let currentTask = null;

const getCronExpression = (frequency, hour) => {
  const h = parseInt(hour) || 3;
  switch (frequency) {
    case 'daily':   return `0 ${h} * * *`;
    case 'weekly':  return `0 ${h} * * 1`;
    case 'monthly': return `0 ${h} 1 * *`;
    default: return `0 3 * * *`;
  }
};

const startErpCron = async () => {
  if (currentTask) { currentTask.stop(); currentTask = null; }

  try {
    const [[sched]] = await sequelize.query(`SELECT * FROM backup_erp_schedule WHERE enabled = 1 LIMIT 1`);
    if (!sched) { console.log('[Backup ERP Cron] No active schedule'); return; }

    const expr = getCronExpression(sched.frequency, sched.hour);
    console.log(`[Backup ERP Cron] Scheduled: ${sched.frequency} at ${sched.hour}:00 (${expr})`);

    currentTask = cron.schedule(expr, async () => {
      console.log('[Backup ERP Cron] Running scheduled backup...');
      try {
        const result = await runBackup(`auto_${sched.frequency}`);
        console.log(`[Backup ERP Cron] Success: ${result.sizeKB} KB, ${result.totalRows} rows`);
      } catch(e) {
        console.error('[Backup ERP Cron] Failed:', e.message);
      }
    }, { timezone: 'Asia/Jakarta' });
  } catch(e) {
    console.warn('[Backup ERP Cron] Could not start (table might not exist yet):', e.message);
  }
};

const restartErpCron = () => {
  if (currentTask) { currentTask.stop(); currentTask = null; }
  setTimeout(startErpCron, 1000);
};

module.exports = { startErpCron, restartErpCron };
