const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const {
  PayrollRun, PayrollItem, PayrollComponent, PayrollSetting,
  EmployeeAllowance, LoanManagement, User, Employee,
  IncentiveParameter, IncentiveEmployeeRate,
} = require('../models');
const engine = require('../services/payrollEngine');
const { notifyPayrollReady } = require('./notificationController');

// ── Seed default components (called from migrate) ───────────────
const seedDefaultComponents = async () => {
  const defaults = [
    // INCOME
    { code:'GAPOK',  name:'Gaji Pokok',          type:'income',    category:'basic_salary',        sort_order:10, is_system:true,  applicable_to:['monthly'],                          default_value:0 },
    { code:'TJ',     name:'Tunjangan Jabatan',    type:'income',    category:'position_allowance',  sort_order:20, is_system:false, applicable_to:['monthly'],                          default_value:0 },
    { code:'RAJIN',  name:'Uang Kerajinan',       type:'income',    category:'attendance_bonus',    sort_order:30, is_system:false, applicable_to:['monthly'],                          default_value:500000 },
    { code:'MAKAN',  name:'Uang Makan',           type:'income',    category:'meal_allowance',      sort_order:40, is_system:false, applicable_to:['monthly'],                          default_value:30000 },
    { code:'TRANS',  name:'Transport',            type:'income',    category:'transport_allowance', sort_order:50, is_system:false, applicable_to:['monthly'],                          default_value:20000 },
    { code:'INSENTIF',name:'Insentif Sales',      type:'income',    category:'incentive',           sort_order:60, is_system:true,  applicable_to:['incentive'],                        default_value:0 },
    { code:'THR',    name:'Tunjangan Hari Raya',  type:'income',    category:'thr',                 sort_order:10, is_system:true,  applicable_to:['thr'],                              default_value:0 },
    { code:'BONUS',  name:'Bonus Tahunan',        type:'income',    category:'bonus',               sort_order:10, is_system:true,  applicable_to:['bonus'],                            default_value:0 },
    // DEDUCTION
    { code:'BPJS_KES',name:'BPJS Kesehatan (1%)', type:'deduction', category:'bpjs',               sort_order:10, is_system:true,  applicable_to:['monthly'],                          default_value:0 },
    { code:'BPJS_JHT',name:'BPJS JHT (2%)',       type:'deduction', category:'bpjs',               sort_order:20, is_system:true,  applicable_to:['monthly'],                          default_value:0 },
    { code:'BPJS_JP', name:'BPJS JP (1%)',         type:'deduction', category:'bpjs',               sort_order:30, is_system:true,  applicable_to:['monthly'],                          default_value:0 },
    { code:'TELAT',   name:'Potongan Terlambat',  type:'deduction', category:'late_deduction',      sort_order:40, is_system:true,  applicable_to:['monthly'],                          default_value:0 },
    { code:'ALPHA',   name:'Potongan Alpha',      type:'deduction', category:'alpha_deduction',     sort_order:50, is_system:true,  applicable_to:['monthly'],                          default_value:0 },
    { code:'LOAN',    name:'Cicilan Pinjaman',    type:'deduction', category:'loan_installment',    sort_order:60, is_system:true,  applicable_to:['monthly'],                          default_value:0 },
    { code:'PPH21',   name:'PPH21',               type:'deduction', category:'pph21',               sort_order:70, is_system:true,  applicable_to:['monthly','thr','bonus'],             default_value:0 },
  ];

  for (const d of defaults) {
    await PayrollComponent.findOrCreate({ where: { code: d.code }, defaults: d });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/payroll/runs/generate
// Generate payroll run (monthly, thr, bonus, incentive)
// ─────────────────────────────────────────────────────────────
const generateRun = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      type = 'monthly',
      period_month,
      period_year,
      user_ids,
      incentive_parameter_id, // for type=incentive
      notes,
    } = req.body;

    if (!period_month || !period_year) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'period_month dan period_year wajib diisi' });
    }

    const settings = await engine.getSettings();

    // Check duplicate run
    // - Blokir jika sudah approved atau paid (tidak bisa diregenerasi)
    // - Izinkan regenerate jika masih calculated (belum diapprove)
    const existing = await PayrollRun.findOne({
      where: { type, period_month: parseInt(period_month), period_year: parseInt(period_year) },
    });
    if (existing) {
      if (['approved','paid'].includes(existing.status)) {
        await t.rollback();
        return res.status(409).json({
          success: false,
          message: `Payroll ${type} ${period_month}/${period_year} sudah di-${existing.status} dan tidak dapat diregenerasi.`,
          code: 'DUPLICATE_RUN',
        });
      }
      // Status calculated atau draft — hapus run lama dan regenerasi ulang
      await PayrollItem.destroy({ where: { payroll_run_id: existing.id }, transaction: t });
      await existing.destroy({ transaction: t });
    }

    // Build period label
    const MONTHS = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const typeLabel = { monthly:'Gaji', incentive:'Insentif', thr:'THR', bonus:'Bonus' }[type] || type;
    const periodLabel = `${typeLabel} ${MONTHS[parseInt(period_month)]} ${period_year}`;

    // Create run header
    const run = await PayrollRun.create({
      type,
      period_month: parseInt(period_month),
      period_year:  parseInt(period_year),
      period_label: periodLabel,
      status: 'draft',
      run_date: new Date().toISOString().split('T')[0],
      pph21_enabled: settings.pph21_enabled,
      pph21_rate:    settings.pph21_rate,
      incentive_sales_total: type === 'incentive' && incentive_parameter_id
        ? (await IncentiveParameter.findByPk(incentive_parameter_id))?.total_sales || 0
        : null,
      generated_by: req.user.id,
      notes,
    }, { transaction: t });

    // Get target employees
    const employees = await engine.getActiveEmployees(user_ids?.length ? user_ids : null);
    if (!employees.length) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Tidak ada karyawan aktif' });
    }

    const items = [];
    const errors = [];
    let totalGross = 0, totalDeductions = 0, totalNet = 0;

    for (const user of employees) {
      const emp = user.employee;
      try {
        let incomeLines   = [];
        let deductionLines = [];
        let pph21Amount   = 0;
        let netSalary     = 0;
        let att           = {};
        let thrEligibility = null, thrMonths = null;

        if (type === 'monthly') {
          const calc = await engine.calculateMonthly(user, emp, parseInt(period_year), parseInt(period_month));
          incomeLines    = calc.income_lines;
          deductionLines = calc.deduction_lines;
          pph21Amount    = calc.pph21_amount;
          netSalary      = calc.net_salary;
          att            = calc.attendance;

        } else if (type === 'thr') {
          const calc = await engine.calculateTHR(user, emp, settings);
          if (calc.eligibility === 'not_eligible') {
            errors.push({ user_id: user.id, name: user.name, reason: calc.note });
            continue;
          }
          incomeLines = [{ component_id: null, code:'THR', name:'Tunjangan Hari Raya', amount: calc.thr_amount, note: calc.note }];
          netSalary   = calc.thr_amount;
          thrEligibility = calc.eligibility;
          thrMonths   = calc.months_worked;

        } else if (type === 'bonus') {
          const calc = await engine.calculateBonus(user, emp, settings);
          if (calc.eligibility === 'not_eligible') {
            errors.push({ user_id: user.id, name: user.name, reason: calc.note });
            continue;
          }
          incomeLines = [{ component_id: null, code:'BONUS', name:'Bonus Tahunan', amount: calc.bonus_amount, note: calc.note }];
          netSalary   = calc.bonus_amount;
          thrEligibility = calc.eligibility;
          thrMonths   = calc.months_worked;

        } else if (type === 'incentive') {
          if (!incentive_parameter_id) {
            errors.push({ user_id: user.id, name: user.name, reason: 'incentive_parameter_id wajib untuk tipe insentif' });
            continue;
          }
          const calc = await engine.calculateIncentive(user.id, incentive_parameter_id);
          if (calc.amount === 0) { continue; } // Skip if no rate set
          incomeLines = [{ component_id: null, code:'INSENTIF', name:'Insentif Sales', amount: calc.amount, note: calc.note }];
          netSalary   = calc.amount;
        }

        const totalInc  = incomeLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
        const totalDed  = deductionLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);

        const item = await PayrollItem.create({
          payroll_run_id:      run.id,
          user_id:             user.id,
          employee_name:       user.name,
          employee_nip:        emp.nip,
          employee_position:   emp.position,
          employee_department: emp.department,
          salary_base_snapshot: parseFloat(emp.salary_base),
          total_income:     Math.round(totalInc),
          total_deductions: Math.round(totalDed + pph21Amount),
          pph21_amount:     Math.round(pph21Amount),
          net_salary:       Math.max(0, Math.round(netSalary)),
          work_days:        att.workDays  || 0,
          present_days:     att.presentDays || 0,
          late_count:       att.lateCount || 0,
          alpha_days:       att.alphaDays || 0,
          leave_days:       att.leaveDays || 0,
          income_lines:    incomeLines,
          deduction_lines: deductionLines,
          thr_months_worked: thrMonths,
          thr_eligibility:   thrEligibility,
          status: 'draft',
        }, { transaction: t });

        totalGross      += totalInc;
        totalDeductions += totalDed + pph21Amount;
        totalNet        += Math.max(0, netSalary);
        items.push(item);

        // Update loan remaining for monthly
        if (type === 'monthly') {
          for (const line of deductionLines.filter(l => l.loan_id)) {
            await LoanManagement.findByPk(line.loan_id).then(async (loan) => {
              if (!loan) return;
              const newRemaining = Math.max(0, parseFloat(loan.remaining_amount) - line.amount);
              const newCount = (loan.installment_count || 0) + 1;
              const newStatus = newRemaining <= 0 ? 'completed' : 'active';
              const history   = loan.installment_history || [];
              history.push({ payroll_run_id: run.id, month: `${period_year}-${period_month}`, amount: line.amount, paid_at: new Date() });
              await loan.update({ remaining_amount: newRemaining, installment_count: newCount, status: newStatus, installment_history: history }, { transaction: t });
            });
          }
        }
      } catch (err) {
        errors.push({ user_id: user.id, name: user.name, reason: err.message });
      }
    }

    // Update run totals
    await run.update({
      total_employees:  items.length,
      total_gross:      Math.round(totalGross),
      total_deductions: Math.round(totalDeductions),
      total_net:        Math.round(totalNet),
      status: 'calculated',
    }, { transaction: t });

    await t.commit();

    return res.status(201).json({
      success: true,
      message: `${periodLabel} berhasil di-generate untuk ${items.length} karyawan`,
      data: { run, items_count: items.length, errors },
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/payroll/runs — list all runs
// ─────────────────────────────────────────────────────────────
const getRuns = async (req, res, next) => {
  try {
    const { type, year, status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (type)   where.type         = type;
    if (year)   where.period_year  = parseInt(year);
    if (status) where.status       = status;

    const { count, rows } = await PayrollRun.findAndCountAll({
      where,
      order: [['period_year','DESC'], ['period_month','DESC'], ['created_at','DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page)-1)*parseInt(limit),
    });
    return res.json({ success: true, data: { runs: rows, pagination: { total: count, page: parseInt(page), totalPages: Math.ceil(count/parseInt(limit)) } } });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// GET /api/payroll/runs/:id — run detail with items
// ─────────────────────────────────────────────────────────────
const getRunDetail = async (req, res, next) => {
  try {
    const run = await PayrollRun.findByPk(req.params.id);
    if (!run) return res.status(404).json({ success: false, message: 'Run tidak ditemukan' });

    const { page = 1, limit = 50 } = req.query;
    const { count, rows: items } = await PayrollItem.findAndCountAll({
      where: { payroll_run_id: run.id },
      order: [['employee_department','ASC'],['employee_name','ASC']],
      limit: parseInt(limit),
      offset: (parseInt(page)-1)*parseInt(limit),
    });

    return res.json({ success: true, data: { run, items, pagination: { total: count, page: parseInt(page), totalPages: Math.ceil(count/parseInt(limit)) } } });
  } catch (err) { next(err); }
};

// GET /api/payroll/items/:id — single slip detail
const getItem = async (req, res, next) => {
  try {
    const item = await PayrollItem.findByPk(req.params.id, {
      include: [{ model: PayrollRun, as: 'run' }, { model: User, as: 'user', attributes: ['id','name','email'] }],
    });
    if (!item) return res.status(404).json({ success: false, message: 'Slip tidak ditemukan' });

    // RBAC: employee only sees own
    if (req.user.role === 'employee' && item.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    return res.json({ success: true, data: { item } });
  } catch (err) { next(err); }
};

// GET /api/payroll/my — karyawan lihat slip sendiri
const getMy = async (req, res, next) => {
  try {
    const { type, page = 1, limit = 12 } = req.query;
    const where = { user_id: req.user.id };
    const runWhere = { status: { [Op.in]: ['approved','paid'] } };
    if (type) runWhere.type = type;

    const { count, rows } = await PayrollItem.findAndCountAll({
      where,
      include: [{ model: PayrollRun, as: 'run', where: runWhere, required: true }],
      order: [[{ model: PayrollRun, as: 'run' }, 'period_year','DESC'],[{ model: PayrollRun, as: 'run' },'period_month','DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page)-1)*parseInt(limit),
    });
    return res.json({ success: true, data: { items: rows, pagination: { total: count, page: parseInt(page), totalPages: Math.ceil(count/parseInt(limit)) } } });
  } catch (err) { next(err); }
};

// PATCH /api/payroll/runs/:id/approve
const approveRun = async (req, res, next) => {
  try {
    const run = await PayrollRun.findByPk(req.params.id);
    if (!run) return res.status(404).json({ success: false, message: 'Run tidak ditemukan' });
    if (!['draft','calculated'].includes(run.status)) {
      return res.status(400).json({ success: false, message: `Status ${run.status} tidak bisa di-approve` });
    }
    await run.update({ status:'approved', approved_by: req.user.id, approved_at: new Date() });
    await PayrollItem.update({ status:'approved' }, { where: { payroll_run_id: run.id } });
    // Notify all employees about their payslip
    notifyPayrollReady(run.id).catch(() => {});
    return res.json({ success: true, message: `${run.period_label} berhasil di-approve`, data: { run } });
  } catch (err) { next(err); }
};

// PATCH /api/payroll/runs/:id/pay
const markPaid = async (req, res, next) => {
  try {
    const run = await PayrollRun.findByPk(req.params.id);
    if (!run) return res.status(404).json({ success: false, message: 'Run tidak ditemukan' });
    if (run.status === 'paid') return res.status(400).json({ success: false, message: 'Sudah ditandai dibayar' });
    const payDate = req.body.payment_date || new Date().toISOString().split('T')[0];
    await run.update({ status:'paid', payment_date: payDate, paid_at: new Date() });
    await PayrollItem.update({ status:'paid' }, { where: { payroll_run_id: run.id } });
    return res.json({ success: true, message: `${run.period_label} berhasil ditandai DIBAYAR`, data: { run } });
  } catch (err) { next(err); }
};

// ── COMPONENT MANAGEMENT ──────────────────────────────────────
const getComponents = async (req, res, next) => {
  try {
    const { type } = req.query;
    const where = {};
    if (type) where.type = type;
    const rows = await PayrollComponent.findAll({ where, order: [['type','ASC'],['sort_order','ASC']] });
    return res.json({ success: true, data: { components: rows } });
  } catch (err) { next(err); }
};

const createComponent = async (req, res, next) => {
  try {
    const { code, name, type, category, default_value, percentage_of_base, applicable_to, sort_order, is_taxable, description } = req.body;
    const exists = await PayrollComponent.findOne({ where: { code: code.toUpperCase() } });
    if (exists) return res.status(409).json({ success: false, message: 'Kode komponen sudah ada' });
    const comp = await PayrollComponent.create({
      code:               code.toUpperCase(),
      name,
      type,
      category:           category || 'flat',
      default_value:      parseFloat(default_value) || 0,
      percentage_of_base: (percentage_of_base === '' || percentage_of_base == null) ? null : parseFloat(percentage_of_base),
      applicable_to:      applicable_to || ['monthly'],
      sort_order:         sort_order || 100,
      is_taxable:         is_taxable !== false,
      is_system:          false,
      description,
    });
    return res.status(201).json({ success: true, message: 'Komponen berhasil ditambahkan', data: { component: comp } });
  } catch (err) { next(err); }
};

const updateComponent = async (req, res, next) => {
  try {
    const comp = await PayrollComponent.findByPk(req.params.id);
    if (!comp) return res.status(404).json({ success: false, message: 'Komponen tidak ditemukan' });
    if (comp.is_system && req.body.category) return res.status(400).json({ success: false, message: 'Komponen sistem tidak bisa diubah kategorinya' });
    const updateData = { ...req.body };
    if (updateData.default_value !== undefined) updateData.default_value = parseFloat(updateData.default_value) || 0;
    if (updateData.percentage_of_base !== undefined) {
      updateData.percentage_of_base = (updateData.percentage_of_base === '' || updateData.percentage_of_base == null)
        ? null : parseFloat(updateData.percentage_of_base);
    }
    await comp.update(updateData);
    return res.json({ success: true, message: 'Komponen berhasil diperbarui', data: { component: comp } });
  } catch (err) { next(err); }
};

const toggleComponent = async (req, res, next) => {
  try {
    const comp = await PayrollComponent.findByPk(req.params.id);
    if (!comp) return res.status(404).json({ success: false, message: 'Tidak ditemukan' });
    await comp.update({ is_active: !comp.is_active });
    return res.json({ success: true, message: `Komponen ${comp.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, data: { component: comp } });
  } catch (err) { next(err); }
};

// ── EMPLOYEE ALLOWANCES ───────────────────────────────────────
const getEmployeeAllowances = async (req, res, next) => {
  try {
    const rows = await EmployeeAllowance.findAll({
      where: { user_id: req.params.userId },
      include: [{ model: PayrollComponent, as: 'component' }],
    });
    return res.json({ success: true, data: { allowances: rows } });
  } catch (err) { next(err); }
};

const upsertEmployeeAllowance = async (req, res, next) => {
  try {
    const { component_id, amount, effective_date, notes } = req.body;
    const [row, created] = await EmployeeAllowance.findOrCreate({
      where: { user_id: req.params.userId, component_id },
      defaults: { amount, effective_date: effective_date || new Date(), notes },
    });
    if (!created) await row.update({ amount, effective_date: effective_date || row.effective_date, notes });
    return res.json({ success: true, message: created ? 'Tunjangan ditambahkan' : 'Tunjangan diperbarui', data: { allowance: row } });
  } catch (err) { next(err); }
};

// ── PAYROLL SETTINGS ──────────────────────────────────────────
const getSettings = async (req, res, next) => {
  try {
    const s = await engine.getSettings();
    return res.json({ success: true, data: { settings: s } });
  } catch (err) { next(err); }
};

const updateSettings = async (req, res, next) => {
  try {
    const s = await engine.getSettings();
    await s.update(req.body);
    return res.json({ success: true, message: 'Pengaturan payroll disimpan', data: { settings: s } });
  } catch (err) { next(err); }
};

// ── INCENTIVE PARAMETERS ──────────────────────────────────────
const getIncentiveParams = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const where = {};
    if (year)  where.period_year  = parseInt(year);
    if (month) where.period_month = parseInt(month);
    const rows = await IncentiveParameter.findAll({
      where,
      include: [{ model: IncentiveEmployeeRate, as: 'rates',
        include: [{ model: User, as: 'user', attributes: ['id','name'], include: [{ model: Employee, as: 'employee', attributes: ['department','position'] }] }] }],
      order: [['period_year','DESC'],['period_month','DESC']],
    });
    return res.json({ success: true, data: { parameters: rows } });
  } catch (err) { next(err); }
};

const createIncentiveParam = async (req, res, next) => {
  try {
    const { period_month, period_year, total_sales, name, description, rates } = req.body;
    const param = await IncentiveParameter.create({ period_month, period_year, total_sales, name: name || 'Sales', description, created_by: req.user.id });

    if (rates?.length) {
      for (const r of rates) {
        const calculated = Math.round(parseFloat(total_sales) * parseFloat(r.rate_percentage) / 100);
        await IncentiveEmployeeRate.create({
          incentive_parameter_id: param.id,
          user_id: r.user_id,
          rate_percentage: r.rate_percentage,
          calculated_amount: calculated,
          notes: r.notes,
        });
      }
    }

    return res.status(201).json({ success: true, message: 'Parameter insentif berhasil dibuat', data: { parameter: param } });
  } catch (err) { next(err); }
};

// ── LOAN MANAGEMENT ───────────────────────────────────────────
const getLoans = async (req, res, next) => {
  try {
    const { status, type } = req.query;
    const where = {};
    if (status) where.status = status;
    if (type)   where.type   = type;
    const rows = await LoanManagement.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id','name'], include: [{ model: Employee, as: 'employee', attributes: ['department','nip'] }] }],
      order: [['loan_date','DESC']],
    });
    return res.json({ success: true, data: { loans: rows } });
  } catch (err) { next(err); }
};

const getMyLoans = async (req, res, next) => {
  try {
    const rows = await LoanManagement.findAll({
      where: { user_id: req.user.id },
      order: [['loan_date','DESC']],
    });
    return res.json({ success: true, data: { loans: rows } });
  } catch (err) { next(err); }
};

const createLoan = async (req, res, next) => {
  try {
    const { user_id, type = 'kasbon', total_amount, monthly_installment, loan_date, start_date, description } = req.body;
    const totalInstallments = Math.ceil(parseFloat(total_amount) / parseFloat(monthly_installment));
    const loan = await LoanManagement.create({
      user_id: user_id || req.user.id, type, total_amount, remaining_amount: total_amount,
      monthly_installment, total_installments: totalInstallments, installment_count: 0,
      loan_date: loan_date || new Date().toISOString().split('T')[0],
      start_date: start_date || new Date().toISOString().split('T')[0],
      status: 'pending', description,
    });
    return res.status(201).json({ success: true, message: `${type} berhasil diajukan`, data: { loan } });
  } catch (err) { next(err); }
};

const approveLoan = async (req, res, next) => {
  try {
    const loan = await LoanManagement.findByPk(req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: 'Pinjaman tidak ditemukan' });
    await loan.update({ status: 'active', approved_by: req.user.id, approved_at: new Date() });
    const { notifyLoanApproved } = require('./notificationController');
    notifyLoanApproved(loan.id).catch(() => {});
    return res.json({ success: true, message: 'Pinjaman disetujui', data: { loan } });
  } catch (err) { next(err); }
};

// Preview THR for all employees
const previewTHR = async (req, res, next) => {
  try {
    const settings  = await engine.getSettings();
    const employees = await engine.getActiveEmployees();
    const results   = [];
    for (const u of employees) {
      const calc = await engine.calculateTHR(u, u.employee, settings);
      results.push({ user_id: u.id, name: u.name, department: u.employee.department, ...calc, salary_base: parseFloat(u.employee.salary_base) });
    }
    return res.json({ success: true, data: { previews: results, total_thr: results.reduce((s,r) => s + r.thr_amount, 0) } });
  } catch (err) { next(err); }
};

module.exports = {
  seedDefaultComponents,
  generateRun, getRuns, getRunDetail, getItem, getMy,
  approveRun, markPaid,
  getComponents, createComponent, updateComponent, toggleComponent,
  getEmployeeAllowances, upsertEmployeeAllowance,
  getSettings, updateSettings,
  getIncentiveParams, createIncentiveParam,
  getLoans, getMyLoans, createLoan, approveLoan,
  previewTHR,
};
