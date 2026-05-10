/**
 * INCENTIVE CALCULATION ENGINE
 * Handles: WA, Marketplace, Web, Activities, Bonus Target
 */
const { Op } = require('sequelize');
const {
  IncEmployee, SalesChannel, BonusTarget,
  WaSale, MarketplaceSale, MarketplaceShare,
  WebSale, WebShare, EmployeeActivity,
  IncentiveResult, IncentivePeriod,
} = require('../models/incentive');

const round2 = n => Math.round((parseFloat(n) || 0) * 100) / 100;

/**
 * Main calculation engine for a period
 * Returns calculated results for all active employees
 */
const calculatePeriod = async (periodId) => {
  const period = await IncentivePeriod.findByPk(periodId);
  if (!period) throw new Error('Periode tidak ditemukan');
  if (period.status === 'locked') throw new Error('Periode sudah terkunci');

  // Load sales channels
  const channels = await SalesChannel.findAll({ where: { is_active: true } });
  const waChannel  = channels.find(c => c.code === 'WA');
  const mpChannel  = channels.find(c => c.code === 'MARKETPLACE');
  const webChannel = channels.find(c => c.code === 'WEB');

  // Load active employees
  const employees = await IncEmployee.findAll({
    where: { is_active: true },
    include: [
      { model: require('../models/incentive/Branch'), as: 'branch' },
      { model: require('../models/incentive/Position'), as: 'position', required: false },
    ],
  });
  const activeCount = employees.length;
  if (!activeCount) throw new Error('Tidak ada karyawan aktif');

  // ── 1. WA Sales per employee ──────────────────────────────
  const waSales = await WaSale.findAll({ where: { period_id: periodId } });
  const waByEmp = {};
  let totalWaSales = 0;
  waSales.forEach(s => {
    if (!waByEmp[s.employee_id]) waByEmp[s.employee_id] = { amount: 0, incentive: 0 };
    waByEmp[s.employee_id].amount   += parseFloat(s.sale_amount);
    waByEmp[s.employee_id].incentive += parseFloat(s.incentive_amount);
    totalWaSales += parseFloat(s.sale_amount);
  });

  // ── 2. Marketplace per employee ───────────────────────────
  const mpSales  = await MarketplaceSale.findAll({ where: { period_id: periodId }, include: [{ model: MarketplaceShare, as: 'shares' }] });
  const mpByEmp  = {};
  let totalMpSales = 0;
  mpSales.forEach(sale => {
    totalMpSales += parseFloat(sale.total_amount);
    (sale.shares || []).forEach(sh => {
      if (!mpByEmp[sh.employee_id]) mpByEmp[sh.employee_id] = { performance: 0, incentive: 0 };
      mpByEmp[sh.employee_id].performance += parseFloat(sh.performance_amount);
      mpByEmp[sh.employee_id].incentive   += parseFloat(sh.incentive_amount);
    });
  });

  // ── 3. Web per employee ───────────────────────────────────
  const webSales = await WebSale.findAll({ where: { period_id: periodId }, include: [{ model: WebShare, as: 'shares' }] });
  const webByEmp = {};
  let totalWebSales = 0;
  webSales.forEach(sale => {
    totalWebSales += parseFloat(sale.total_amount);
    (sale.shares || []).forEach(sh => {
      if (!webByEmp[sh.employee_id]) webByEmp[sh.employee_id] = { performance: 0, incentive: 0 };
      webByEmp[sh.employee_id].performance += parseFloat(sh.performance_amount);
      webByEmp[sh.employee_id].incentive   += parseFloat(sh.incentive_amount);
    });
  });

  // ── 4. Activities per employee ────────────────────────────
  const activities = await EmployeeActivity.findAll({
    where: { period_id: periodId },
    include: [{ model: require('../models/incentive/ActivityType'), as: 'activityType' }],
  });
  const actByEmp = {};
  activities.forEach(a => {
    if (!actByEmp[a.employee_id]) actByEmp[a.employee_id] = { incentive: 0, details: [] };
    actByEmp[a.employee_id].incentive += parseFloat(a.incentive_amount);
    actByEmp[a.employee_id].details.push({
      activity: a.activityType?.name,
      date: a.date,
      qty: parseFloat(a.qty),
      nominal: parseFloat(a.nominal_snapshot),
      amount: parseFloat(a.incentive_amount),
      notes: a.notes,
    });
  });

  // ── 5. Bonus Target ───────────────────────────────────────
  const totalAllSales = totalWaSales + totalMpSales + totalWebSales;
  const bonusTargets  = await BonusTarget.findAll({
    where: { is_active: true, min_amount: { [Op.lte]: totalAllSales } },
    order: [['min_amount', 'DESC']],
  });
  const achievedTarget = bonusTargets[0] || null; // Tertinggi yang tercapai
  const totalBonus     = achievedTarget ? parseFloat(achievedTarget.bonus_amount) : 0;
  const bonusPerEmp    = activeCount > 0 ? round2(totalBonus / activeCount) : 0;

  // ── 6. Build results per employee ────────────────────────
  const results = [];
  for (const emp of employees) {
    const wa  = waByEmp[emp.id]  || { amount: 0, incentive: 0 };
    const mp  = mpByEmp[emp.id]  || { performance: 0, incentive: 0 };
    const web = webByEmp[emp.id] || { performance: 0, incentive: 0 };
    const act = actByEmp[emp.id] || { incentive: 0, details: [] };

    const totalIncentive = round2(
      wa.incentive + mp.incentive + web.incentive + act.incentive + bonusPerEmp
    );

    const detailsJson = {
      wa:          { sales: wa.amount,        incentive: wa.incentive,  channel_pct: waChannel?.percentage },
      marketplace: { performance: mp.performance, incentive: mp.incentive, channel_pct: mpChannel?.percentage },
      web:         { performance: web.performance, incentive: web.incentive, channel_pct: webChannel?.percentage },
      activities:  { incentive: act.incentive, details: act.details },
      bonus_target:{ amount: bonusPerEmp, tier: achievedTarget ? { name: achievedTarget.name, min: achievedTarget.min_amount, total_bonus: achievedTarget.bonus_amount } : null },
    };

    results.push({
      period_id:              periodId,
      employee_id:            emp.id,
      branch_id:              emp.branch_id,
      wa_sales_amount:        round2(wa.amount),
      marketplace_performance:round2(mp.performance),
      web_performance:        round2(web.performance),
      wa_incentive:           round2(wa.incentive),
      marketplace_incentive:  round2(mp.incentive),
      web_incentive:          round2(web.incentive),
      activity_incentive:     round2(act.incentive),
      bonus_target:           bonusPerEmp,
      total_incentive:        totalIncentive,
      employee_name:          emp.name,
      branch_name:            emp.branch?.name,
      position_name:          emp.position?.name,
      details_json:           detailsJson,
      status:                 'draft',
    });
  }

  // ── 7. Upsert results ────────────────────────────────────
  await IncentiveResult.destroy({ where: { period_id: periodId } });
  await IncentiveResult.bulkCreate(results);

  // ── 8. Update period summary ─────────────────────────────
  const totalPaid = results.reduce((s, r) => s + r.total_incentive, 0);
  await period.update({
    status:                  'calculated',
    total_wa_sales:          round2(totalWaSales),
    total_marketplace_sales: round2(totalMpSales),
    total_web_sales:         round2(totalWebSales),
    total_all_sales:         round2(totalAllSales),
    total_incentive_paid:    round2(totalPaid),
    bonus_target_id:         achievedTarget?.id || null,
    bonus_per_employee:      bonusPerEmp,
    active_employee_count:   activeCount,
    calculated_at:           new Date(),
  });

  return {
    period,
    total_employees:         results.length,
    total_wa_sales:          round2(totalWaSales),
    total_marketplace_sales: round2(totalMpSales),
    total_web_sales:         round2(totalWebSales),
    total_all_sales:         round2(totalAllSales),
    total_incentive_paid:    round2(totalPaid),
    bonus_achieved:          achievedTarget,
    bonus_per_employee:      bonusPerEmp,
    results,
  };
};

/**
 * Calculate WA incentive for a single transaction
 */
const calcWaIncentive = (amount, channelPct) =>
  round2(parseFloat(amount) * parseFloat(channelPct) / 100);

/**
 * Calculate share amounts for Marketplace/Web
 */
const calcShares = (totalAmount, shares, channelPct) => {
  const totalPct = shares.reduce((s, sh) => s + parseFloat(sh.share_percentage), 0);
  return shares.map(sh => {
    const pct         = parseFloat(sh.share_percentage);
    const performance = round2(parseFloat(totalAmount) * pct / 100);
    const incentive   = round2(performance * parseFloat(channelPct) / 100);
    return { ...sh, performance_amount: performance, incentive_amount: incentive };
  });
};

/**
 * Calculate activity incentive
 */
const calcActivityIncentive = (qty, nominal) =>
  round2(parseFloat(qty) * parseFloat(nominal));

module.exports = {
  calculatePeriod,
  calcWaIncentive,
  calcShares,
  calcActivityIncentive,
};
