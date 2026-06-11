const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const {
  IncentivePeriod, IncEmployee, SalesChannel, BonusTarget,
  WaSale, MarketplaceSale, MarketplaceShare,
  WebSale, WebShare, EmployeeActivity,
  IncentiveResult, Branch, AuditLog,
} = require('../../models/incentive');
const engine = require('../../services/incentiveEngine');

const MONTHS_ID = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const audit = async (req, action, module, id, desc) => {
  try { await AuditLog.create({ user_id: req.user?.id, user_name: req.user?.name, action, module, record_id: id, description: desc, ip_address: req.ip }); } catch {}
};

// ─────────────────────────────────────────────────────────────
// PERIODS
// ─────────────────────────────────────────────────────────────
const getPeriods = async (req, res, next) => {
  try {
    const { year, status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (year)   where.year   = parseInt(year);
    if (status) where.status = status;

    const { count, rows } = await IncentivePeriod.findAndCountAll({
      where,
      order: [['year', 'DESC'], ['month', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });
    return res.json({ success: true, data: { periods: rows, pagination: { total: count, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) } } });
  } catch (err) { next(err); }
};

const getPeriod = async (req, res, next) => {
  try {
    const period = await IncentivePeriod.findByPk(req.params.id);
    if (!period) return res.status(404).json({ success: false, message: 'Periode tidak ditemukan' });
    return res.json({ success: true, data: { period } });
  } catch (err) { next(err); }
};

const createPeriod = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    const exists = await IncentivePeriod.findOne({ where: { month: parseInt(month), year: parseInt(year) } });
    if (exists) return res.status(409).json({ success: false, message: `Periode ${MONTHS_ID[month]} ${year} sudah ada` });

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay   = new Date(year, month, 0).getDate();
    const endDate   = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    const name      = req.body.name || `Insentif ${MONTHS_ID[parseInt(month)]} ${year}`;

    const period = await IncentivePeriod.create({
      name, month: parseInt(month), year: parseInt(year),
      start_date: startDate, end_date: endDate,
      status: 'draft', created_by: req.user?.id,
    });
    await audit(req, 'CREATE', 'periods', period.id, `Periode ${name} dibuat`);
    return res.status(201).json({ success: true, message: `Periode ${name} berhasil dibuat`, data: { period } });
  } catch (err) { next(err); }
};

const approvePeriod = async (req, res, next) => {
  try {
    const period = await IncentivePeriod.findByPk(req.params.id);
    if (!period) return res.status(404).json({ success: false, message: 'Periode tidak ditemukan' });
    if (period.status !== 'calculated') return res.status(400).json({ success: false, message: 'Hanya periode berstatus "calculated" yang bisa di-approve' });

    await period.update({
      status:         'approved',
      approved_by:    req.user?.id,
      approved_at:    new Date(),
      approved_notes: req.body.notes || null,
    });
    await IncentiveResult.update({ status: 'approved' }, { where: { period_id: period.id } });
    await audit(req, 'APPROVE', 'periods', period.id, `Periode ${period.name} di-approve`);
    return res.json({ success: true, message: `${period.name} berhasil di-approve`, data: { period } });
  } catch (err) { next(err); }
};

const lockPeriod = async (req, res, next) => {
  try {
    const period = await IncentivePeriod.findByPk(req.params.id);
    if (!period) return res.status(404).json({ success: false, message: 'Periode tidak ditemukan' });
    if (period.status !== 'approved') return res.status(400).json({ success: false, message: 'Hanya periode approved yang bisa dikunci' });
    await period.update({ status: 'locked' });
    await IncentiveResult.update({ status: 'locked' }, { where: { period_id: period.id } });
    await audit(req, 'LOCK', 'periods', period.id, `Periode ${period.name} dikunci`);
    return res.json({ success: true, message: `${period.name} berhasil dikunci`, data: { period } });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// CALCULATE ENGINE
// ─────────────────────────────────────────────────────────────
const calculatePeriod = async (req, res, next) => {
  try {
    const period = await IncentivePeriod.findByPk(req.params.id);
    if (!period) return res.status(404).json({ success: false, message: 'Periode tidak ditemukan' });
    if (period.status === 'locked') return res.status(400).json({ success: false, message: 'Periode sudah terkunci' });

    const result = await engine.calculatePeriod(parseInt(req.params.id));
    await audit(req, 'CALCULATE', 'periods', period.id, `Periode ${period.name} dikalkulasi`);
    return res.json({ success: true, message: `Kalkulasi ${period.name} selesai!`, data: result });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// WA SALES
// ─────────────────────────────────────────────────────────────
const getWaSales = async (req, res, next) => {
  try {
    const { period_id, branch_id, employee_id } = req.query;
    const where = {};
    if (period_id)   where.period_id   = period_id;
    if (branch_id)   where.branch_id   = branch_id;
    if (employee_id) where.employee_id = employee_id;

    const rows = await WaSale.findAll({
      where,
      include: [
        { model: IncEmployee, as: 'employee', attributes: ['id','name'] },
        { model: Branch,      as: 'branch',   attributes: ['id','name','code'] },
      ],
      order: [['date', 'DESC'], ['created_at', 'DESC']],
    });

    const totals = rows.reduce((s, r) => ({
      sale_amount:    s.sale_amount    + parseFloat(r.sale_amount),
      incentive_amount: s.incentive_amount + parseFloat(r.incentive_amount),
    }), { sale_amount: 0, incentive_amount: 0 });

    return res.json({ success: true, data: { sales: rows, totals } });
  } catch (err) { next(err); }
};

const createWaSale = async (req, res, next) => {
  try {
    const period = await IncentivePeriod.findByPk(req.body.period_id);
    if (!period) return res.status(404).json({ success: false, message: 'Periode tidak ditemukan' });
    if (period.status === 'locked') return res.status(400).json({ success: false, message: 'Periode sudah terkunci' });

    const channel = await SalesChannel.findOne({ where: { code: 'WA', is_active: true } });
    if (!channel) return res.status(400).json({ success: false, message: 'Channel WA belum dikonfigurasi' });

    const incentive = engine.calcWaIncentive(req.body.sale_amount, channel.percentage);
    const sale = await WaSale.create({
      ...req.body,
      channel_pct:      channel.percentage,
      incentive_amount: incentive,
      created_by:       req.user?.id,
    });
    return res.status(201).json({ success: true, message: 'Penjualan WA berhasil ditambahkan', data: { sale, incentive } });
  } catch (err) { next(err); }
};

const updateWaSale = async (req, res, next) => {
  try {
    const sale = await WaSale.findByPk(req.params.id);
    if (!sale) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    const period = await IncentivePeriod.findByPk(sale.period_id);
    if (period?.status === 'locked') return res.status(400).json({ success: false, message: 'Periode sudah terkunci' });

    const channel  = await SalesChannel.findOne({ where: { code: 'WA', is_active: true } });
    const incentive = engine.calcWaIncentive(req.body.sale_amount || sale.sale_amount, channel.percentage);
    await sale.update({ ...req.body, channel_pct: channel.percentage, incentive_amount: incentive });
    return res.json({ success: true, message: 'Data diperbarui', data: { sale } });
  } catch (err) { next(err); }
};

const deleteWaSale = async (req, res, next) => {
  try {
    const sale = await WaSale.findByPk(req.params.id);
    if (!sale) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    const period = await IncentivePeriod.findByPk(sale.period_id);
    if (period?.status === 'locked') return res.status(400).json({ success: false, message: 'Periode sudah terkunci' });
    await sale.destroy();
    return res.json({ success: true, message: 'Data penjualan WA dihapus' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// MARKETPLACE SALES
// ─────────────────────────────────────────────────────────────
const getMarketplaceSales = async (req, res, next) => {
  try {
    const { period_id, branch_id } = req.query;
    const where = {};
    if (period_id) where.period_id = period_id;
    if (branch_id) where.branch_id = branch_id;
    const rows = await MarketplaceSale.findAll({
      where,
      include: [
        { model: Branch, as: 'branch', attributes: ['id','name','code'] },
        { model: MarketplaceShare, as: 'shares',
          include: [{ model: IncEmployee, as: 'employee', attributes: ['id','name'] }] },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ success: true, data: { sales: rows } });
  } catch (err) { next(err); }
};

const upsertMarketplaceSale = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { period_id, branch_id, total_amount, shares, notes } = req.body;
    const period = await IncentivePeriod.findByPk(period_id, { transaction: t });
    if (period?.status === 'locked') { await t.rollback(); return res.status(400).json({ success: false, message: 'Periode sudah terkunci' }); }

    // Validate shares total = 100%
    if (shares?.length) {
      const totalPct = shares.reduce((s, sh) => s + parseFloat(sh.share_percentage || 0), 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        await t.rollback();
        return res.status(400).json({ success: false, message: `Total pembagian harus 100%! Sekarang: ${totalPct.toFixed(2)}%`, code: 'SHARE_NOT_100' });
      }
    }

    const channel = await SalesChannel.findOne({ where: { code: 'MARKETPLACE', is_active: true } });
    if (!channel) { await t.rollback(); return res.status(400).json({ success: false, message: 'Channel Marketplace belum dikonfigurasi' }); }

    // Upsert sale header
    let [sale] = await MarketplaceSale.findOrCreate({ where: { period_id, branch_id }, transaction: t, defaults: { total_amount, channel_pct: channel.percentage, notes, created_by: req.user?.id } });
    if (sale) await sale.update({ total_amount, channel_pct: channel.percentage, notes }, { transaction: t });

    // Recalculate and upsert shares
    if (shares?.length) {
      await MarketplaceShare.destroy({ where: { marketplace_sale_id: sale.id }, transaction: t });
      const calculated = engine.calcShares(total_amount, shares, channel.percentage);
      for (const sh of calculated) {
        await MarketplaceShare.create({
          marketplace_sale_id: sale.id,
          employee_id:         sh.user_id || sh.employee_id,
          share_percentage:    sh.share_percentage,
          performance_amount:  sh.performance_amount,
          incentive_amount:    sh.incentive_amount,
        }, { transaction: t });
      }
    }

    await t.commit();
    return res.json({ success: true, message: 'Data Marketplace berhasil disimpan', data: { sale } });
  } catch (err) { await t.rollback(); next(err); }
};

// ─────────────────────────────────────────────────────────────
// WEB SALES
// ─────────────────────────────────────────────────────────────
const getWebSales = async (req, res, next) => {
  try {
    const { period_id, branch_id } = req.query;
    const where = {};
    if (period_id) where.period_id = period_id;
    if (branch_id) where.branch_id = branch_id;
    const rows = await WebSale.findAll({
      where,
      include: [
        { model: Branch, as: 'branch', attributes: ['id','name','code'] },
        { model: WebShare, as: 'shares',
          include: [{ model: IncEmployee, as: 'employee', attributes: ['id','name'] }] },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ success: true, data: { sales: rows } });
  } catch (err) { next(err); }
};

const upsertWebSale = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { period_id, branch_id, total_amount, shares, notes } = req.body;
    const period = await IncentivePeriod.findByPk(period_id, { transaction: t });
    if (period?.status === 'locked') { await t.rollback(); return res.status(400).json({ success: false, message: 'Periode sudah terkunci' }); }

    if (shares?.length) {
      const totalPct = shares.reduce((s, sh) => s + parseFloat(sh.share_percentage || 0), 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        await t.rollback();
        return res.status(400).json({ success: false, message: `Total pembagian harus 100%! Sekarang: ${totalPct.toFixed(2)}%`, code: 'SHARE_NOT_100' });
      }
    }

    const channel = await SalesChannel.findOne({ where: { code: 'WEB', is_active: true } });
    if (!channel) { await t.rollback(); return res.status(400).json({ success: false, message: 'Channel Web belum dikonfigurasi' }); }

    let [sale] = await WebSale.findOrCreate({ where: { period_id, branch_id }, transaction: t, defaults: { total_amount, channel_pct: channel.percentage, notes, created_by: req.user?.id } });
    if (sale) await sale.update({ total_amount, channel_pct: channel.percentage, notes }, { transaction: t });

    if (shares?.length) {
      await WebShare.destroy({ where: { web_sale_id: sale.id }, transaction: t });
      const calculated = engine.calcShares(total_amount, shares, channel.percentage);
      for (const sh of calculated) {
        await WebShare.create({
          web_sale_id:         sale.id,
          employee_id:         sh.user_id || sh.employee_id,
          share_percentage:    sh.share_percentage,
          performance_amount:  sh.performance_amount,
          incentive_amount:    sh.incentive_amount,
        }, { transaction: t });
      }
    }

    await t.commit();
    return res.json({ success: true, message: 'Data Web berhasil disimpan', data: { sale } });
  } catch (err) { await t.rollback(); next(err); }
};

// ─────────────────────────────────────────────────────────────
// ACTIVITIES
// ─────────────────────────────────────────────────────────────
const getActivities = async (req, res, next) => {
  try {
    const { period_id, branch_id, employee_id } = req.query;
    const where = {};
    if (period_id)   where.period_id   = period_id;
    if (branch_id)   where.branch_id   = branch_id;
    if (employee_id) where.employee_id = employee_id;
    const rows = await EmployeeActivity.findAll({
      where,
      include: [
        { model: IncEmployee,  as: 'employee',     attributes: ['id','name'] },
        { model: require('../../models/incentive/ActivityType'), as: 'activityType', attributes: ['id','name','calc_type','unit_label'] },
      ],
      order: [['date', 'DESC']],
    });
    const total = rows.reduce((s, r) => s + parseFloat(r.incentive_amount), 0);
    return res.json({ success: true, data: { activities: rows, total_incentive: total } });
  } catch (err) { next(err); }
};

const createActivity = async (req, res, next) => {
  try {
    const { period_id, employee_id, branch_id, activity_type_id, date, qty, notes } = req.body;
    const period = await IncentivePeriod.findByPk(period_id);
    if (period?.status === 'locked') return res.status(400).json({ success: false, message: 'Periode sudah terkunci' });

    const actType = await require('../../models/incentive/ActivityType').findByPk(activity_type_id);
    if (!actType) return res.status(404).json({ success: false, message: 'Jenis aktivitas tidak ditemukan' });

    const incentive = engine.calcActivityIncentive(qty, actType.nominal);
    const act = await EmployeeActivity.create({
      period_id, employee_id, branch_id, activity_type_id, date, qty,
      nominal_snapshot: actType.nominal,
      incentive_amount: incentive,
      notes, created_by: req.user?.id,
    });
    return res.status(201).json({ success: true, message: 'Aktivitas berhasil ditambahkan', data: { activity: act, incentive } });
  } catch (err) { next(err); }
};

const deleteActivity = async (req, res, next) => {
  try {
    const act = await EmployeeActivity.findByPk(req.params.id);
    if (!act) return res.status(404).json({ success: false, message: 'Tidak ditemukan' });
    const period = await IncentivePeriod.findByPk(act.period_id);
    if (period?.status === 'locked') return res.status(400).json({ success: false, message: 'Periode sudah terkunci' });
    await act.destroy();
    return res.json({ success: true, message: 'Aktivitas dihapus' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────
const getResults = async (req, res, next) => {
  try {
    const { period_id, branch_id } = req.query;
    const where = { period_id };
    if (branch_id) where.branch_id = branch_id;
    const rows = await IncentiveResult.findAll({
      where,
      include: [
        { model: IncEmployee, as: 'employee', include: [{ model: Branch, as: 'branch', attributes: ['id','name','code'] }] },
      ],
      order: [['total_incentive', 'DESC']],
    });
    const summary = {
      total_employees: rows.length,
      total_incentive: rows.reduce((s, r) => s + parseFloat(r.total_incentive), 0),
      total_wa:        rows.reduce((s, r) => s + parseFloat(r.wa_incentive), 0),
      total_mp:        rows.reduce((s, r) => s + parseFloat(r.marketplace_incentive), 0),
      total_web:       rows.reduce((s, r) => s + parseFloat(r.web_incentive), 0),
      total_activity:  rows.reduce((s, r) => s + parseFloat(r.activity_incentive), 0),
      total_bonus:     rows.reduce((s, r) => s + parseFloat(r.bonus_target), 0),
    };
    return res.json({ success: true, data: { results: rows, summary } });
  } catch (err) { next(err); }
};

const getResultDetail = async (req, res, next) => {
  try {
    const result = await IncentiveResult.findByPk(req.params.id, {
      include: [
        { model: IncEmployee,    as: 'employee' },
        { model: IncentivePeriod,as: 'period' },
      ],
    });
    if (!result) return res.status(404).json({ success: false, message: 'Slip tidak ditemukan' });
    return res.json({ success: true, data: { result } });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────────
const getDashboardStats = async (req, res, next) => {
  try {
    const currentYear  = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [branches, employees, latestPeriod, allPeriods] = await Promise.all([
      Branch.findAll({ where: { is_active: true } }),
      IncEmployee.findAll({ where: { is_active: true } }),
      IncentivePeriod.findOne({ order: [['year','DESC'],['month','DESC']] }),
      IncentivePeriod.findAll({ where: { year: currentYear }, order: [['month','ASC']] }),
    ]);

    let latestResults = [];
    if (latestPeriod) {
      latestResults = await IncentiveResult.findAll({
        where: { period_id: latestPeriod.id },
        order: [['total_incentive','DESC']],
        limit: 5,
        include: [{ model: IncEmployee, as: 'employee', attributes: ['id','name'] }],
      });
    }

    const monthlyTrend = allPeriods.map(p => ({
      month: MONTHS_ID[p.month], month_num: p.month,
      total_sales: parseFloat(p.total_all_sales),
      total_incentive: parseFloat(p.total_incentive_paid),
      status: p.status,
    }));

    return res.json({
      success: true,
      data: {
        summary: {
          total_branches:  branches.length,
          total_employees: employees.length,
          latest_period:   latestPeriod?.name,
          latest_status:   latestPeriod?.status,
          latest_sales:    latestPeriod ? parseFloat(latestPeriod.total_all_sales) : 0,
          latest_incentive:latestPeriod ? parseFloat(latestPeriod.total_incentive_paid) : 0,
        },
        top_performers: latestResults,
        monthly_trend:  monthlyTrend,
        branches:        branches,
      },
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// SYNC FROM ERP
// Tarik data order ERP yang completed ke insentif WA & Marketplace
// dengan deduksi retur
// ═══════════════════════════════════════════════════════════════
const syncFromERP = async (req, res, next) => {
  try {
    const { period_id } = req.params;
    const period = await IncentivePeriod.findByPk(period_id);
    if (!period) return res.status(404).json({ success: false, message: 'Periode tidak ditemukan' });
    if (period.status === 'locked') return res.status(400).json({ success: false, message: 'Periode sudah terkunci' });

    // Build date range from period
    const from = `${period.year}-${String(period.month).padStart(2,'0')}-01`;
    const lastDay = new Date(period.year, period.month, 0).getDate();
    const to = `${period.year}-${String(period.month).padStart(2,'0')}-${lastDay}`;

    const { Op } = require('sequelize');
    const {
      Order, OrderItem, Return, ReturnItem
    } = require('../../models/erp');

    const waChannel  = await SalesChannel.findOne({ where: { code: 'WA' } });
    const mpChannel  = await SalesChannel.findOne({ where: { code: 'MARKETPLACE' } });

    // ── Fetch completed WA orders ──────────────────────────────
    const waOrders = await Order.findAll({
      where: {
        channel: 'wa',
        status: 'completed',
        order_date: { [Op.between]: [from, to] },
        salesperson_id: { [Op.ne]: null },
      },
      raw: true,
    });

    // ── Fetch returns for WA this period ──────────────────────
    const waReturns = await Return.findAll({
      where: {
        status: 'confirmed',
        created_at: { [Op.between]: [new Date(from), new Date(to + 'T23:59:59')] },
      },
      include: [
        { model: ReturnItem, as: 'items', attributes: ['subtotal'] },
        { model: Order, as: 'order', attributes: ['channel', 'salesperson_id'] },
      ],
    });

    // Build retur map per salesperson for WA
    const waReturnByEmp = {};
    waReturns.forEach(r => {
      if (r.order?.channel !== 'wa' || !r.order?.salesperson_id) return;
      const empId = r.order.salesperson_id;
      const total = (r.items||[]).reduce((s,i) => s + parseFloat(i.subtotal||0), 0);
      waReturnByEmp[empId] = (waReturnByEmp[empId]||0) + total;
    });

    // ── Sync WA ────────────────────────────────────────────────
    let waAdded = 0, waSkipped = 0, waUpdated = 0;
    for (const order of waOrders) {
      const empId = order.salesperson_id;
      const netAmount = parseFloat(order.total_amount) - (waReturnByEmp[empId]||0);
      if (netAmount <= 0) { waSkipped++; continue; }

      // Check if already synced (by order ref)
      const existing = await WaSale.findOne({
        where: { period_id, employee_id: empId, notes: { [Op.like]: `%${order.order_no}%` } },
      });

      const pct       = parseFloat(waChannel?.percentage || 3);
      const incentive = engine.calcWaIncentive ? engine.calcWaIncentive(netAmount, pct) : Math.round(netAmount * pct / 100);

      if (existing) {
        // Update if amount changed
        if (Math.abs(parseFloat(existing.sale_amount) - netAmount) > 1) {
          await existing.update({ sale_amount: netAmount, incentive_amount: incentive });
          waUpdated++;
        } else { waSkipped++; }
      } else {
        await WaSale.create({
          period_id, employee_id: empId, branch_id: order.branch_id,
          sale_amount: netAmount, channel_pct: pct, incentive_amount: incentive,
          date: order.order_date, customer_name: order.customer_name||'',
          notes: `Sync ERP: ${order.order_no}${(waReturnByEmp[empId]||0)>0?` (sudah deduksi retur Rp${new Intl.NumberFormat('id-ID').format(waReturnByEmp[empId]||0)})`:''}`,
          created_by: req.user?.id,
        });
        waAdded++;
      }
    }

    // ── Fetch completed Marketplace orders ─────────────────────
    const mpOrders = await Order.findAll({
      where: {
        channel: 'marketplace',
        status: 'completed',
        order_date: { [Op.between]: [from, to] },
      },
      raw: true,
    });

    // ── Fetch returns for Marketplace this period ──────────────
    const mpReturns = await Return.findAll({
      where: { status: 'confirmed', created_at: { [Op.between]: [new Date(from), new Date(to + 'T23:59:59')] } },
      include: [
        { model: ReturnItem, as: 'items', attributes: ['subtotal'] },
        { model: Order, as: 'order', attributes: ['channel', 'sub_channel_name'] },
      ],
    });

    // Build return total for marketplace
    let mpReturnTotal = 0;
    mpReturns.forEach(r => {
      if (r.order?.channel !== 'marketplace') return;
      mpReturnTotal += (r.items||[]).reduce((s,i) => s + parseFloat(i.subtotal||0), 0);
    });

    // Total MP sales this period
    const mpTotalAmount = mpOrders.reduce((s, o) => s + parseFloat(o.total_amount), 0);
    const mpNetAmount   = Math.max(0, mpTotalAmount - mpReturnTotal);
    const mpPct         = parseFloat(mpChannel?.percentage || 0.5);

    // Sync as single aggregate MP sale per branch per period
    let mpAdded = 0, mpUpdated = 0;
    if (mpOrders.length > 0 && mpNetAmount > 0) {
      const mpExisting = await MarketplaceSale.findOne({
        where: { period_id, notes: { [Op.like]: '%Sync ERP%' } },
      });

      // Find existing by period_id + branch_id (handles unique constraint)
      const mpByBranch = await MarketplaceSale.findOne({
        where: { period_id, branch_id: mpOrders[0].branch_id || 1 },
      });
      const mpNote = `Sync ERP: ${mpOrders.length} order${mpReturnTotal>0?` (deduksi retur Rp${new Intl.NumberFormat('id-ID').format(mpReturnTotal)})`:''}`;
      if (mpByBranch) {
        await mpByBranch.update({ total_amount: mpNetAmount, notes: mpNote });
        mpUpdated++;
      } else {
        await MarketplaceSale.create({
          period_id, branch_id: mpOrders[0].branch_id || 1,
          platform: 'marketplace', total_amount: mpNetAmount,
          channel_pct: parseFloat(mpChannel?.percentage || 0.5),
          date: to, notes: mpNote,
        });
        mpAdded++;
      }
    }

    return res.json({
      success: true,
      message: `Sinkronisasi selesai`,
      data: {
        wa:  { added: waAdded, updated: waUpdated, skipped: waSkipped, return_deducted: Object.values(waReturnByEmp).reduce((s,v)=>s+v,0) },
        mp:  { added: mpAdded, updated: mpUpdated, net_amount: mpNetAmount, return_deducted: mpReturnTotal },
        period: period.name,
      },
    });
  } catch (err) { next(err); }
};


// ── POST /api/incentive/periods/:id/disburse ─────────────────
// Transfer insentif via Flip untuk semua karyawan dalam periode
const disbursePeriod = async (req, res, next) => {
  try {
    const period = await IncentivePeriod.findByPk(req.params.id);
    if (!period) return res.status(404).json({ success:false, message:'Periode tidak ditemukan' });
    if (!['approved','locked'].includes(period.status))
      return res.status(400).json({ success:false, message:'Periode harus di-approve dulu sebelum transfer' });

    const { sequelize: seq } = require('../../config/database');
    const flip = require('../../services/flipService');
    const { Employee, User } = require('../../models');

    // Get all results with employee bank info
    const results = await IncentiveResult.findAll({
      where: { period_id: period.id, flip_status: { [require('sequelize').Op.notIn]: ['DONE'] } },
      include: [{ model: IncEmployee, as: 'employee', required: true }],
    });

    if (!results.length)
      return res.status(400).json({ success:false, message:'Semua karyawan sudah ditransfer' });

    const out = { success:0, failed:0, skipped:0, errors:[] };

    for (const result of results) {
      if (!result.total_incentive || parseFloat(result.total_incentive) <= 0) {
        out.skipped++; continue;
      }

      // Get bank info from employees table via user_id
      const empUser = result.employee?.user_id
        ? await User.findByPk(result.employee.user_id, {
            include: [{ model: Employee, as: 'employee' }]
          })
        : null;

      const bankCode    = empUser?.employee?.bank_code;
      const bankAccount = empUser?.employee?.bank_account_number;
      const bankName    = empUser?.employee?.bank_account_name || result.employee_name;

      if (!bankCode || !bankAccount) {
        await result.update({ flip_status: 'FAILED', flip_error: 'Rekening bank belum diisi' });
        out.failed++;
        out.errors.push(`${result.employee_name}: rekening bank belum diisi`);
        continue;
      }

      try {
        const idempotencyKey = `incentive-${period.id}-result-${result.id}`;
        const remark = `Insentif ${period.name || period.id}`.substring(0, 18);

        const disbursement = await flip.createDisbursement({
          idempotencyKey,
          amount:        parseFloat(result.total_incentive),
          bankCode,
          accountNumber: bankAccount,
          accountName:   bankName,
          remark,
        });

        await result.update({
          flip_disbursement_id: String(disbursement.id),
          flip_status:          flip.mapStatus(disbursement.status),
          flip_error:           null,
          transfer_at:          disbursement.status === 'DONE' ? new Date() : null,
        });
        out.success++;
      } catch (err) {
        const errMsg = err.response?.data?.errors?.[0]?.message || err.message;
        await result.update({ flip_status: 'FAILED', flip_error: errMsg });
        out.failed++;
        out.errors.push(`${result.employee_name}: ${errMsg}`);
      }
    }

    // Update period status if all done
    const allResults = await IncentiveResult.findAll({ where: { period_id: period.id } });
    const allDone = allResults.every(r => r.flip_status === 'DONE');
    if (allDone) await period.update({ status: 'locked' });

    return res.json({
      success: true,
      message: `Transfer selesai: ${out.success} berhasil, ${out.failed} gagal, ${out.skipped} dilewati`,
      data: out,
    });
  } catch (err) { next(err); }
};

// ── GET /api/incentive/periods/:id/disburse-status ───────────
const getDisbursePeriodStatus = async (req, res, next) => {
  try {
    const { sequelize: seq } = require('../../config/database');
    const flip = require('../../services/flipService');
    const { Employee, User } = require('../../models');

    const results = await IncentiveResult.findAll({
      where: { period_id: req.params.id },
      include: [{ model: IncEmployee, as: 'employee', required: false }],
    });

    const items = await Promise.all(results.map(async r => {
      const empUser = r.employee?.user_id
        ? await User.findByPk(r.employee.user_id, { include: [{ model: Employee, as: 'employee' }] })
        : null;
      return {
        id:                r.id,
        employee_name:     r.employee_name,
        net_salary:        r.total_incentive,
        flip_status:       r.flip_status || 'NONE',
        flip_error:        r.flip_error,
        flip_disbursement_id: r.flip_disbursement_id,
        transfer_at:       r.transfer_at,
        bank_code:         empUser?.employee?.bank_code,
        bank_account_number: empUser?.employee?.bank_account_number,
      };
    }));

    const summary = {
      total:   items.length,
      done:    items.filter(i => i.flip_status === 'DONE').length,
      pending: items.filter(i => ['NONE','PENDING'].includes(i.flip_status)).length,
      failed:  items.filter(i => i.flip_status === 'FAILED').length,
    };

    // Calculate total needed (not yet done)
    const totalNeeded = items.filter(i => i.flip_status !== 'DONE')
      .reduce((s,i) => s + parseFloat(i.net_salary||0), 0);

    let currentBalance = 0;
    try { const b = await flip.getBalance(); currentBalance = b.balance || 0; } catch {}

    return res.json({ success:true, data: { items, summary, totalNeeded, currentBalance, sufficient: currentBalance >= totalNeeded } });
  } catch (err) { next(err); }
};

module.exports = {
  getPeriods, getPeriod, createPeriod, approvePeriod, lockPeriod,
  calculatePeriod,
  getWaSales, createWaSale, updateWaSale, deleteWaSale,
  getMarketplaceSales, upsertMarketplaceSale,
  getWebSales, upsertWebSale,
  getActivities, createActivity, deleteActivity,
  getResults, getResultDetail,
  getDashboardStats,
  syncFromERP,
  disbursePeriod, getDisbursePeriodStatus,
};
