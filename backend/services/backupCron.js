const cron = require('node-cron');
const { sequelize } = require('../config/database');
const { runBackup } = require('../controllers/backupController');

let currentTask = null;

const getCronExpression = (frequency, hour) => {
  const h = parseInt(hour) || 2;
  switch (frequency) {
    case 'daily':   return `0 ${h} * * *`;      // every day at hour
    case 'weekly':  return `0 ${h} * * 1`;      // every Monday at hour
    case 'monthly': return `0 ${h} 1 * *`;      // 1st of month at hour
    default: return `0 2 * * *`;
  }
};

const startCron = async () => {
  if (currentTask) { currentTask.stop(); currentTask = null; }

  try {
    const [[sched]] = await sequelize.query(`SELECT * FROM backup_schedule WHERE enabled = 1 LIMIT 1`);
    if (!sched) { console.log('[Backup Cron] No active schedule'); return; }

    const expr = getCronExpression(sched.frequency, sched.hour);
    console.log(`[Backup Cron] Scheduled: ${sched.frequency} at ${sched.hour}:00 (${expr})`);

    currentTask = cron.schedule(expr, async () => {
      console.log('[Backup Cron] Running scheduled backup...');
      try {
        const result = await runBackup(`auto_${sched.frequency}`);
        console.log(`[Backup Cron] Success: ${result.sizeKB} KB, ${result.totalRows} rows`);
      } catch(e) {
        console.error('[Backup Cron] Failed:', e.message);
      }
    }, { timezone: 'Asia/Jakarta' });
  } catch(e) {
    console.warn('[Backup Cron] Could not start (table might not exist yet):', e.message);
  }
};

const restartCron = () => {
  if (currentTask) { currentTask.stop(); currentTask = null; }
  setTimeout(startCron, 1000);
};

module.exports = { startCron, restartCron };
