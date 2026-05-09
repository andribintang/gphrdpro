const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { Payroll, User, Employee, Attendance, LeaveRequest } = require('../models');
const { validationResult } = require('express-validator');

// ── Constants ──────────────────────────────────────────────────
const WORK_DAYS_PER_MONTH = 22;          // Standar hari kerja/bulan
const OVERTIME_MULTIPLIER  = 1.5;        // Lembur = 1.5x gaji per jam
const WORK_HOURS_PER_DAY   = 8;
const BPJS_KESEHATAN_PCT   = 0.01;       // 1% ditanggung karyawan
const BPJS_TK_PCT          = 0.02;       // 2% JHT karyawan
const PPH21_THRESHOLD      = 4500000;    // PTKP per bulan (sederhana)
const PPH21_RATE           = 0.05;       // Tarif PPH21 lapis pertama
const LATE_DEDUCTION        = 25000;     // Potongan per keterlambatan

// ── Helpers ────────────────────────────────────────────────────
const toRupiah = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

const getMonthRange = (month) => {
  const [y, m] = month.split('-');
  const start = `${y}-${m}-01`;
  const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
  const end = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
};

const calcPPH21 = (grossMonthly) => {
  const taxable = Math.max(0, grossMonthly - PPH21_THRESHOLD);
  return Math.round(taxable * PPH21_RATE);
};

// ─────────────────────────────────────────────────────────────
// CORE: Auto-calculate payroll for one employee for one month
// ─────────────────────────────────────────────────────────────
const calculatePayroll = async (userId, month) => {
  const { start, end } = getMonthRange(month);

  // Get employee data
  const user = await User.findByPk(userId, {
    include: [{ model: Employee, as: 'employee' }],
  });
  if (!user?.employee) throw new Error(`Karyawan dengan user_id=${userId} tidak ditemukan`);

  const salaryBase = parseFloat(user.employee.salary_base) || 0;
  const salaryPerDay  = salaryBase / WORK_DAYS_PER_MONTH;
  const salaryPerHour = salaryPerDay / WORK_HOURS_PER_DAY;

  // Get attendance records for the month
  const attendances = await Attendance.findAll({
    where: { user_id: userId, date: { [Op.between]: [start, end] } },
    order: [['date', 'ASC']],
  });

  // Get approved leaves for the month
  const leaves = await LeaveRequest.findAll({
    where: {
      user_id: userId,
      status: 'approved',
      [Op.or]: [
        { start_date: { [Op.between]: [start, end] } },
        { end_date:   { [Op.between]: [start, end] } },
        { start_date: { [Op.lte]: start }, end_date: { [Op.gte]: end } },
      ],
    },
  });

  // Tally attendance stats
  const stats = {
    present:     attendances.filter(a => a.status === 'present').length,
    late:        attendances.filter(a => a.status === 'late').length,
    absent:      attendances.filter(a => a.status === 'absent').length,
    leave:       leaves.reduce((s, l) => s + l.total_days, 0),
    total_hours: attendances.reduce((s, a) => s + (parseFloat(a.work_hours) || 0), 0),
    overtime_hours: Math.max(
      0,
      attendances.reduce((s, a) => s + (parseFloat(a.work_hours) || 0), 0) -
      (attendances.filter(a => a.check_in).length * WORK_HOURS_PER_DAY)
    ),
  };

  // ── Build Allowances ───────────────────────────────────────
  const allowanceItems = [
    { name: 'Tunjangan Transport', amount: 300000 },
    { name: 'Tunjangan Makan',     amount: 450000 },
  ];

  // Meal & transport cut for absences (beyond approved leave)
  const unjustifiedAbsent = Math.max(0, WORK_DAYS_PER_MONTH - stats.present - stats.late - stats.leave);
  if (unjustifiedAbsent > 0) {
    allowanceItems.push({
      name: `Koreksi Absen (${unjustifiedAbsent} hari)`,
      amount: -(salaryPerDay * unjustifiedAbsent),
    });
  }

  // Overtime
  const overtimePay = Math.round(stats.overtime_hours * salaryPerHour * OVERTIME_MULTIPLIER);
  if (overtimePay > 0) {
    allowanceItems.push({ name: `Lembur (${stats.overtime_hours.toFixed(1)} jam)`, amount: overtimePay });
  }

  const totalAllowances = allowanceItems.reduce((s, a) => s + a.amount, 0);

  // ── Build Deductions ───────────────────────────────────────
  const grossSalary = salaryBase + totalAllowances;

  const bpjsKesehatan = Math.round(salaryBase * BPJS_KESEHATAN_PCT);
  const bpjsTK        = Math.round(salaryBase * BPJS_TK_PCT);
  const lateDeduction = stats.late * LATE_DEDUCTION;
  const pph21         = calcPPH21(grossSalary);

  const deductionItems = [
    { name: 'BPJS Kesehatan (1%)',    amount: bpjsKesehatan },
    { name: 'BPJS TK / JHT (2%)',     amount: bpjsTK },
    { name: `PPH 21 (${PPH21_RATE * 100}%)`, amount: pph21 },
  ];
  if (lateDeduction > 0) {
    deductionItems.push({ name: `Potongan Terlambat (${stats.late}x)`, amount: lateDeduction });
  }

  const totalDeductions = deductionItems.reduce((s, d) => s + d.amount, 0);
  const totalSalary     = Math.max(0, grossSalary - totalDeductions);

  return {
    user_id:        userId,
    month,
    salary_base:    salaryBase,
    allowances:     Math.round(totalAllowances),
    deductions:     Math.round(totalDeductions),
    overtime_pay:   overtimePay,
    total_salary:   Math.round(totalSalary),
    details_json: {
      employee: {
        name:       user.name,
        nip:        user.employee.nip,
        position:   user.employee.position,
        department: user.employee.department,
      },
      attendance_summary: {
        ...stats,
        overtime_hours: parseFloat(stats.overtime_hours.toFixed(2)),
      },
      allowance_items:  allowanceItems.map(a => ({ ...a, amount: Math.round(a.amount) })),
      deduction_items:  deductionItems,
      gross_salary:     Math.round(grossSalary),
      calculated_at:    new Date().toISOString(),
    },
  };
};

// ─────────────────────────────────────────────────────────────
// POST /api/payroll/generate  — Generate payroll (HR/Admin)
// Body: { month: "YYYY-MM", user_ids?: [1,2,3] }
// ─────────────────────────────────────────────────────────────
const generate = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await t.rollback();
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { month, user_ids } = req.body;

    // Get all active employees (or specific ones)
    const whereUser = { is_active: true };
    const includeEmp = [{
      model: Employee,
      as: 'employee',
      required: true,
      where: { status: 'active' },
    }];

    let targetUsers;
    if (user_ids?.length) {
      targetUsers = await User.findAll({
        where: { ...whereUser, id: { [Op.in]: user_ids } },
        include: includeEmp,
      });
    } else {
      // All employees (exclude admin)
      targetUsers = await User.findAll({
        where: { ...whereUser, role: { [Op.in]: ['employee', 'hr', 'supervisor'] } },
        include: includeEmp,
      });
    }

    if (!targetUsers.length) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Tidak ada karyawan aktif ditemukan' });
    }

    const results = { created: [], updated: [], errors: [] };

    for (const user of targetUsers) {
      try {
        const calc = await calculatePayroll(user.id, month);

        // Upsert: update if exists, create if not
        const existing = await Payroll.findOne({
          where: { user_id: user.id, month },
          transaction: t,
        });

        if (existing) {
          if (existing.status === 'paid') {
            results.errors.push({ user_id: user.id, name: user.name, reason: 'Gaji sudah dibayar, tidak bisa diubah' });
            continue;
          }
          await existing.update({ ...calc, status: 'processed', processed_by: req.user.id }, { transaction: t });
          results.updated.push({ user_id: user.id, name: user.name, total_salary: calc.total_salary });
        } else {
          await Payroll.create({
            ...calc,
            status: 'processed',
            processed_by: req.user.id,
          }, { transaction: t });
          results.created.push({ user_id: user.id, name: user.name, total_salary: calc.total_salary });
        }
      } catch (err) {
        results.errors.push({ user_id: user.id, name: user.name, reason: err.message });
      }
    }

    await t.commit();

    const totalGenerated = results.created.length + results.updated.length;
    return res.status(201).json({
      success: true,
      message: `Payroll ${month} berhasil digenerate untuk ${totalGenerated} karyawan`,
      data: { month, ...results },
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/payroll?month=YYYY-MM  — List payroll (HR/Admin)
// ─────────────────────────────────────────────────────────────
const getAll = async (req, res, next) => {
  try {
    const { month, status, page = 1, limit = 50 } = req.query;
    const where = {};
    if (month)  where.month  = month;
    if (status) where.status = status;

    const { count, rows } = await Payroll.findAndCountAll({
      where,
      include: [
        {
          model: User, as: 'user', attributes: ['id', 'name', 'email'],
          include: [{ model: Employee, as: 'employee', attributes: ['nip', 'department', 'position'], required: false }],
        },
      ],
      order: [['month', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    // Summary totals
    const allForMonth = month ? await Payroll.findAll({ where: { month } }) : [];
    const summary = {
      total_records:   count,
      total_gaji:      allForMonth.reduce((s, p) => s + parseFloat(p.total_salary), 0),
      total_potongan:  allForMonth.reduce((s, p) => s + parseFloat(p.deductions), 0),
      status_counts: {
        draft:     allForMonth.filter(p => p.status === 'draft').length,
        processed: allForMonth.filter(p => p.status === 'processed').length,
        paid:      allForMonth.filter(p => p.status === 'paid').length,
      },
    };

    return res.json({
      success: true,
      data: {
        payrolls: rows,
        summary,
        pagination: { total: count, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) },
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// GET /api/payroll/my?month=YYYY-MM  — My payroll history
// ─────────────────────────────────────────────────────────────
const getMy = async (req, res, next) => {
  try {
    const { month, page = 1, limit = 12 } = req.query;
    const where = { user_id: req.user.id };
    if (month) where.month = month;

    const { count, rows } = await Payroll.findAndCountAll({
      where,
      order: [['month', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return res.json({
      success: true,
      data: {
        payrolls: rows,
        pagination: { total: count, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) },
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// GET /api/payroll/:id  — Detail slip gaji
// ─────────────────────────────────────────────────────────────
const getOne = async (req, res, next) => {
  try {
    const payroll = await Payroll.findByPk(req.params.id, {
      include: [
        {
          model: User, as: 'user', attributes: ['id', 'name', 'email'],
          include: [{ model: Employee, as: 'employee', required: false }],
        },
      ],
    });
    if (!payroll) return res.status(404).json({ success: false, message: 'Data payroll tidak ditemukan' });

    // Employee can only see own
    if (req.user.role === 'employee' && payroll.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    return res.json({ success: true, data: { payroll } });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/payroll/:id/pay  — Mark as paid (Admin/HR)
// ─────────────────────────────────────────────────────────────
const markPaid = async (req, res, next) => {
  try {
    const payroll = await Payroll.findByPk(req.params.id);
    if (!payroll) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    if (payroll.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Gaji sudah ditandai lunas' });
    }
    await payroll.update({ status: 'paid', paid_at: new Date() });
    return res.json({ success: true, message: 'Gaji berhasil ditandai sudah dibayar', data: { payroll } });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/payroll/bulk-pay  — Mark all processed as paid for a month
// ─────────────────────────────────────────────────────────────
const bulkPay = async (req, res, next) => {
  try {
    const { month } = req.body;
    if (!month) return res.status(400).json({ success: false, message: 'Month diperlukan' });

    const [count] = await Payroll.update(
      { status: 'paid', paid_at: new Date() },
      { where: { month, status: 'processed' } }
    );

    return res.json({
      success: true,
      message: `${count} slip gaji bulan ${month} berhasil ditandai dibayar`,
      data: { month, updated: count },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// GET /api/payroll/summary?year=YYYY  — Yearly summary (Admin)
// ─────────────────────────────────────────────────────────────
const getSummary = async (req, res, next) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const payrolls = await Payroll.findAll({
      where: { month: { [Op.like]: `${year}-%` } },
      attributes: ['month', 'total_salary', 'deductions', 'allowances', 'status'],
    });

    // Group by month
    const byMonth = {};
    payrolls.forEach(p => {
      if (!byMonth[p.month]) byMonth[p.month] = { month: p.month, total: 0, deductions: 0, count: 0, paid: 0 };
      byMonth[p.month].total      += parseFloat(p.total_salary);
      byMonth[p.month].deductions += parseFloat(p.deductions);
      byMonth[p.month].count++;
      if (p.status === 'paid') byMonth[p.month].paid++;
    });

    const months = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
    const yearTotal = months.reduce((s, m) => s + m.total, 0);

    return res.json({
      success: true,
      data: { year, months, year_total: yearTotal, total_records: payrolls.length },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/payroll/:id  — Delete draft payroll only
// ─────────────────────────────────────────────────────────────
const remove = async (req, res, next) => {
  try {
    const payroll = await Payroll.findByPk(req.params.id);
    if (!payroll) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    if (payroll.status !== 'processed') {
      return res.status(400).json({ success: false, message: 'Hanya payroll berstatus processed yang bisa dihapus' });
    }
    await payroll.destroy();
    return res.json({ success: true, message: 'Data payroll berhasil dihapus' });
  } catch (err) { next(err); }
};

module.exports = { generate, getAll, getMy, getOne, markPaid, bulkPay, getSummary, remove };
