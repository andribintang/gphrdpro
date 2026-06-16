/**
 * INCENTIVE CALCULATION ENGINE
 * Handles: WA, Marketplace, Web, Activities, Bonus Target
 */
const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');
const {
  IncEmployee, SalesChannel, BonusTarget, ChannelRate,
  WaSale, MarketplaceSale, MarketplaceShare,
  WebSale, WebShare, EmployeeActivity,
  IncentiveResult, IncentivePeriod,
} = require('../models/incentive');

const round2 = n => Math.round((parseFloat(n) || 0) * 100) / 100;

// Check if employee is eligible based on channel/bonus eligible_statuses
const isEligible = (employee, eligibleStatuses) => {
  if (!eligibleStatuses || eligibleStatuses.length === 0) return true;
  const status = employee.employment_status || 'kontrak';
  return eligibleStatuses.includes(status);
};

/**
 * Get effective percentage for a branch+channel combo
 * Returns branch-specific rate if exists, falls back to global channel rate
 */
const getEffectiveRate = async (channelCode, branchId, channelsMap) => {
  const channel = channelsMap[channelCode];
  if (!channel) return 0;

  // Check branch-specific rate first
  if (branchId) {
    const branchRate = await ChannelRate.findOne({
      where: { branch_id: branchId, channel_id: channel.id, is_active: true },
    });
    if (branchRate && parseFloat(branchRate.percentage) > 0) {
      return parseFloat(branchRate.percentage);
    }
  }
  // Fallback to global rate
  return parseFloat(channel.percentage) || 0;
};

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

  // Build channels map for quick lookup
  const channelsMap = {};
  channels.forEach(ch => { channelsMap[ch.code] = ch; });

  // ── Load master share templates (MARKETPLACE & WEB only, per branch) ───
  const [shareTemplates] = await sequelize.query(
    `SELECT * FROM inc_share_templates WHERE is_active = 1`
  );
  // templatesByBranchChannel[branch_id][channel_code][employee_id] = pct
  const templatesByBranchChannel = {};
  shareTemplates.forEach(t => {
    const bId = String(t.branch_id);
    if (!templatesByBranchChannel[bId]) templatesByBranchChannel[bId] = { MARKETPLACE: {}, WEB: {} };
    if (templatesByBranchChannel[bId][t.channel_code]) {
      templatesByBranchChannel[bId][t.channel_code][t.employee_id] = parseFloat(t.share_percentage);
    }
  });

  // ── 1. WA Sales — cara LAMA: per karyawan sesuai penjualan masing-masing dari ERP ──
  const waSales = await WaSale.findAll({ where: { period_id: periodId } });
  const waByEmp = {};
  let totalWaSales = 0;
  const waEligibleStatuses = channelsMap['WA']?.eligible_statuses || ['kontrak','tetap'];

  for (const s of waSales) {
    const emp = employees.find(e => e.id === s.employee_id);
    const effectiveWaPct = await getEffectiveRate('WA', emp?.branch_id, channelsMap);
    const eligible = emp ? isEligible(emp, waEligibleStatuses) : true;
    const recalcIncentive = eligible ? round2(parseFloat(s.sale_amount) * effectiveWaPct / 100) : 0;
    if (!waByEmp[s.employee_id]) waByEmp[s.employee_id] = { amount: 0, incentive: 0, pct: effectiveWaPct, eligible };
    waByEmp[s.employee_id].amount    += parseFloat(s.sale_amount);
    waByEmp[s.employee_id].incentive += recalcIncentive;
    totalWaSales += parseFloat(s.sale_amount);
  }

  // ── 2. Marketplace — per CABANG, dibagi pakai master template cabang tersebut ──
  const mpSales = await MarketplaceSale.findAll({
    where: { period_id: periodId },
    include: [{ model: MarketplaceShare, as: 'shares' }],
  });
  const mpByEmp = {};
  const mpEligibleStatuses = channelsMap['MARKETPLACE']?.eligible_statuses || ['kontrak','tetap'];

  // Group MP sales by branch_id
  const mpByBranch = {};
  for (const sale of mpSales) {
    const bId = String(sale.branch_id);
    if (!mpByBranch[bId]) mpByBranch[bId] = 0;
    mpByBranch[bId] += parseFloat(sale.total_amount);
  }
  let totalMpSales = Object.values(mpByBranch).reduce((s, v) => s + v, 0);

  for (const [bId, branchTotal] of Object.entries(mpByBranch)) {
    const branchTemplate = templatesByBranchChannel[bId]?.MARKETPLACE;
    const effectiveMpPct = await getEffectiveRate('MARKETPLACE', parseInt(bId), channelsMap);
    const branchIncentivePool = round2(branchTotal * effectiveMpPct / 100);

    if (branchTemplate && Object.keys(branchTemplate).length > 0) {
      // Use master template for this branch
      for (const [empId, pct] of Object.entries(branchTemplate)) {
        const emp2 = employees.find(e => e.id === parseInt(empId));
        const eligible = emp2 ? isEligible(emp2, mpEligibleStatuses) : true;
        const portion = round2(branchIncentivePool * pct / 100);
        if (!mpByEmp[empId]) mpByEmp[empId] = { performance: 0, incentive: 0, pct: effectiveMpPct, template_pct: 0 };
        mpByEmp[empId].performance += round2(branchTotal * pct / 100);
        mpByEmp[empId].incentive   += eligible ? portion : 0;
        mpByEmp[empId].template_pct += pct;
      }
    } else {
      // Fallback: per-sale shares (cara lama) for sales in this branch
      const salesInBranch = mpSales.filter(s => String(s.branch_id) === bId);
      for (const sale of salesInBranch) {
        for (const sh of (sale.shares || [])) {
          const emp2 = employees.find(e => e.id === sh.employee_id);
          const performance = parseFloat(sh.performance_amount);
          const eligible    = emp2 ? isEligible(emp2, mpEligibleStatuses) : true;
          const incentive   = eligible ? round2(performance * effectiveMpPct / 100) : 0;
          if (!mpByEmp[sh.employee_id]) mpByEmp[sh.employee_id] = { performance: 0, incentive: 0, pct: effectiveMpPct };
          mpByEmp[sh.employee_id].performance += performance;
          mpByEmp[sh.employee_id].incentive   += incentive;
        }
      }
    }
  }

  // ── 3. Web — per CABANG, dibagi pakai master template cabang tersebut ──────
  const webSales = await WebSale.findAll({
    where: { period_id: periodId },
    include: [{ model: WebShare, as: 'shares' }],
  });
  const webByEmp = {};
  const webEligibleStatuses = channelsMap['WEB']?.eligible_statuses || ['kontrak','tetap'];

  const webByBranch = {};
  for (const sale of webSales) {
    const bId = String(sale.branch_id);
    if (!webByBranch[bId]) webByBranch[bId] = 0;
    webByBranch[bId] += parseFloat(sale.total_amount);
  }
  let totalWebSales = Object.values(webByBranch).reduce((s, v) => s + v, 0);

  for (const [bId, branchTotal] of Object.entries(webByBranch)) {
    const branchTemplate = templatesByBranchChannel[bId]?.WEB;
    const effectiveWebPct = await getEffectiveRate('WEB', parseInt(bId), channelsMap);
    const branchIncentivePool = round2(branchTotal * effectiveWebPct / 100);

    if (branchTemplate && Object.keys(branchTemplate).length > 0) {
      for (const [empId, pct] of Object.entries(branchTemplate)) {
        const emp3 = employees.find(e => e.id === parseInt(empId));
        const eligible = emp3 ? isEligible(emp3, webEligibleStatuses) : true;
        const portion = round2(branchIncentivePool * pct / 100);
        if (!webByEmp[empId]) webByEmp[empId] = { performance: 0, incentive: 0, pct: effectiveWebPct, template_pct: 0 };
        webByEmp[empId].performance += round2(branchTotal * pct / 100);
        webByEmp[empId].incentive   += eligible ? portion : 0;
        webByEmp[empId].template_pct += pct;
      }
    } else {
      const salesInBranch = webSales.filter(s => String(s.branch_id) === bId);
      for (const sale of salesInBranch) {
        for (const sh of (sale.shares || [])) {
          const emp3 = employees.find(e => e.id === sh.employee_id);
          const performance = parseFloat(sh.performance_amount);
          const eligible    = emp3 ? isEligible(emp3, webEligibleStatuses) : true;
          const incentive   = eligible ? round2(performance * effectiveWebPct / 100) : 0;
          if (!webByEmp[sh.employee_id]) webByEmp[sh.employee_id] = { performance: 0, incentive: 0, pct: effectiveWebPct };
          webByEmp[sh.employee_id].performance += performance;
          webByEmp[sh.employee_id].incentive   += incentive;
        }
      }
    }
  }

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
  const achievedTarget = bonusTargets[0] || null;
  const totalBonus     = achievedTarget ? parseFloat(achievedTarget.bonus_amount) : 0;

  // Eligible statuses for bonus from BonusTarget setting
  const bonusEligibleStatuses = achievedTarget?.eligible_statuses || ['kontrak','tetap'];
  const eligibleForBonus      = employees.filter(e => isEligible(e, bonusEligibleStatuses));
  const eligibleCount         = eligibleForBonus.length;
  const bonusPerEmp           = eligibleCount > 0 ? round2(totalBonus / eligibleCount) : 0;

  // ── 6. Build results per employee ────────────────────────
  const results = [];
  for (const emp of employees) {
    const wa  = waByEmp[emp.id]  || { amount: 0, incentive: 0 };
    const mp  = mpByEmp[emp.id]  || { performance: 0, incentive: 0 };
    const web = webByEmp[emp.id] || { performance: 0, incentive: 0 };
    const act = actByEmp[emp.id] || { incentive: 0, details: [] };

    const empBonusAmount = isEligible(emp, bonusEligibleStatuses) ? bonusPerEmp : 0;
    const totalIncentive = round2(
      wa.incentive + mp.incentive + web.incentive + act.incentive + empBonusAmount
    );

    const detailsJson = {
      wa:          { sales: wa.amount,        incentive: wa.incentive,  channel_pct: wa.pct  || waChannel?.percentage },
      marketplace: { performance: mp.performance, incentive: mp.incentive, channel_pct: mp.pct  || mpChannel?.percentage },
      web:         { performance: web.performance, incentive: web.incentive, channel_pct: web.pct || webChannel?.percentage },
      activities:  { incentive: act.incentive, details: act.details },
      bonus_target:{ amount: isEligible(emp, bonusEligibleStatuses) ? bonusPerEmp : 0, excluded: !isEligible(emp, bonusEligibleStatuses), tier: achievedTarget ? { name: achievedTarget.name, min: achievedTarget.min_amount, total_bonus: achievedTarget.bonus_amount } : null },
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
      bonus_target:           empBonusAmount,
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
