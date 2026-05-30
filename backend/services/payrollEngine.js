/**
 * PAYROLL ENGINE — Core calculation logic
 * Handles: monthly, incentive, thr, bonus
 */
const { Op } = require('sequelize');
const {
  User, Employee, Attendance, LeaveRequest,
  PayrollSetting, PayrollComponent, EmployeeAllowance,
  LoanManagement, IncentiveParameter, IncentiveEmployeeRate,
} = require('../models');

// ── Helpers ────────────────────────────────────────────────────
const getMonthRange = (year, month) => {
  const m = String(month).padStart(2, '0');
  const start = `${year}-${m}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${m}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
};

const countWorkDays = (year, month) => {
  let count = 0;
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
};

const calcMonthsWorked = (joinDate) => {
  const join = new Date(joinDate);
  const now  = new Date();
  return (now.getFullYear() - join.getFullYear()) * 12 + (now.getMonth() - join.getMonth());
};

const round2 = (n) => Math.round((parseFloat(n) || 0) * 100) / 100;

// ── Load global settings ───────────────────────────────────────
const getSettings = async () => {
  let s = await PayrollSetting.findOne();
  if (!s) {
    // Create defaults if not exists
    s = await PayrollSetting.create({});
  }
  return s;
};

// ── Load active components ─────────────────────────────────────
const getComponents = async (applicableTo = 'monthly') => {
  const all = await PayrollComponent.findAll({
    where: { is_active: true },
    order: [['sort_order', 'ASC'], ['type', 'ASC']],
  });
  return all.filter(c => {
    try {
      const app = Array.isArray(c.applicable_to) ? c.applicable_to : JSON.parse(c.applicable_to || '["monthly"]');
      return app.includes(applicableTo);
    } catch { return false; }
  });
};

// ── Load employee allowance overrides ──────────────────────────
const getEmployeeAllowances = async (userId) => {
  const rows = await EmployeeAllowance.findAll({
    where: {
      user_id: userId,
      is_active: true,
      effective_date: { [Op.lte]: new Date() },
      [Op.or]: [
        { end_date: null },
        { end_date: { [Op.gte]: new Date() } },
      ],
    },
    include: [{ model: PayrollComponent, as: 'component' }],
  });
  const map = {};
  rows.forEach(r => { map[r.component_id] = r.amount; });
  return map;
};

// ── Load attendance for period ─────────────────────────────────
const getAttendanceSummary = async (userId, year, month) => {
  const { start, end } = getMonthRange(year, month);
  const records = await Attendance.findAll({
    where: { user_id: userId, date: { [Op.between]: [start, end] } },
  });

  const workDays = countWorkDays(year, month);
  const presentDays   = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const lateCount     = records.filter(r => r.status === 'late').length;
  const leaveDays     = records.filter(r => r.status === 'leave').length;
  // Alpha = harusnya masuk tapi tidak ada record dan bukan cuti/libur
  const alphaDays     = Math.max(0, workDays - presentDays - leaveDays);

  return { workDays, presentDays, lateCount, alphaDays, leaveDays, records };
};

// ── Load active loans for employee ────────────────────────────
const getActiveLoans = async (userId) => {
  return LoanManagement.findAll({
    where: { user_id: userId, status: 'active' },
    order: [['loan_date', 'ASC']],
  });
};

// ═══════════════════════════════════════════════════════════════
// MONTHLY PAYROLL CALCULATOR
// ═══════════════════════════════════════════════════════════════
const calculateMonthly = async (user, employee, year, month) => {
  const settings    = await getSettings();
  const components  = await getComponents('monthly');
  const empAllowances = await getEmployeeAllowances(user.id);
  const att         = await getAttendanceSummary(user.id, year, month);
  const loans       = await getActiveLoans(user.id);

  const salaryBase  = parseFloat(employee.salary_base) || 0;
  const dailySalary = salaryBase / (settings.work_days_per_month || 22);

  const incomeLines   = [];
  const deductionLines = [];

  // ── INCOME COMPONENTS ────────────────────────────────────────
  for (const comp of components.filter(c => c.type === 'income')) {
    let amount = 0;
    let note   = '';

    switch (comp.category) {
      case 'basic_salary':
        amount = salaryBase;
        note   = `Gaji pokok bulan ${month}/${year}`;
        break;

      case 'position_allowance':
      case 'flat':
        // Use employee override or component default
        amount = empAllowances[comp.id] !== undefined ? empAllowances[comp.id] : parseFloat(comp.default_value);
        break;

      case 'attendance_bonus': {
        // Uang kerajinan — per hari hadir (default_value = nilai per hari)
        const perDay = empAllowances[comp.id] !== undefined ? empAllowances[comp.id] : parseFloat(comp.default_value);
        amount = perDay * att.presentDays;
        note   = `${att.presentDays} hari × Rp ${perDay.toLocaleString('id-ID')}`;
        break;
      }

      case 'meal_allowance':
      case 'transport_allowance': {
        // Per hari hadir
        const perDay = empAllowances[comp.id] !== undefined ? empAllowances[comp.id] : parseFloat(comp.default_value);
        amount = perDay * att.presentDays;
        note   = `${att.presentDays} hari × Rp ${perDay.toLocaleString('id-ID')}`;
        break;
      }

      case 'percentage': {
        const pct = parseFloat(comp.percentage_of_base) || 0;
        amount = salaryBase * pct / 100;
        note   = `${pct}% dari gaji pokok`;
        break;
      }

      // incentive, thr, bonus — handled by separate engines
      default:
        continue;
    }

    if (amount > 0) {
      incomeLines.push({
        component_id: comp.id,
        code: comp.code,
        name: comp.name,
        amount: round2(amount),
        note,
      });
    }
  }

  // ── DEDUCTION COMPONENTS ─────────────────────────────────────
  const totalGrossBeforeDeduct = incomeLines.reduce((s, l) => s + l.amount, 0);

  for (const comp of components.filter(c => c.type === 'deduction')) {
    let amount = 0;
    let note   = '';

    switch (comp.category) {
      case 'bpjs':
        if (!settings.bpjs_enabled) continue;
        if (comp.code === 'BPJS_KES') {
          amount = salaryBase * parseFloat(settings.bpjs_kes_employee) / 100;
          note   = `${settings.bpjs_kes_employee}% dari gaji pokok`;
        } else if (comp.code === 'BPJS_JHT') {
          amount = salaryBase * parseFloat(settings.bpjs_tk_jht_emp) / 100;
          note   = `${settings.bpjs_tk_jht_emp}% dari gaji pokok`;
        } else if (comp.code === 'BPJS_JP') {
          amount = salaryBase * parseFloat(settings.bpjs_tk_jp_emp) / 100;
          note   = `${settings.bpjs_tk_jp_emp}% dari gaji pokok`;
        }
        break;

      case 'late_deduction':
        if (att.lateCount > 0) {
          // Prioritas: override per karyawan > default_value komponen > settings.late_deduction_amount
          const perLate = empAllowances[comp.id] !== undefined
            ? parseFloat(empAllowances[comp.id])
            : (parseFloat(comp.default_value) > 0
                ? parseFloat(comp.default_value)
                : parseFloat(settings.late_deduction_amount) || 25000);
          amount = perLate * att.lateCount;
          note   = `${att.lateCount}x terlambat × Rp ${perLate.toLocaleString('id-ID')}`;
        }
        break;

      case 'alpha_deduction':
        if (att.alphaDays > 0) {
          if (settings.alpha_deduction_type === 'per_day_salary') {
            amount = dailySalary * att.alphaDays;
            note   = `${att.alphaDays} hari alpha × Rp ${Math.round(dailySalary).toLocaleString('id-ID')}`;
          } else {
            amount = parseFloat(settings.alpha_flat_amount) * att.alphaDays;
            note   = `${att.alphaDays} hari alpha × flat`;
          }
        }
        break;

      case 'loan_installment':
        // Cicilan pinjaman — handled below
        continue;

      case 'flat':
        amount = empAllowances[comp.id] !== undefined ? empAllowances[comp.id] : parseFloat(comp.default_value);
        break;

      case 'percentage':
        amount = totalGrossBeforeDeduct * (parseFloat(comp.percentage_of_base) || 0) / 100;
        break;

      default:
        continue;
    }

    if (amount > 0) {
      deductionLines.push({
        component_id: comp.id,
        code: comp.code,
        name: comp.name,
        amount: round2(amount),
        note,
      });
    }
  }

  // ── LOAN INSTALLMENTS ─────────────────────────────────────────
  for (const loan of loans) {
    const installment = Math.min(
      parseFloat(loan.monthly_installment),
      parseFloat(loan.remaining_amount)
    );
    if (installment > 0) {
      deductionLines.push({
        component_id: null,
        code: 'LOAN',
        name: `Cicilan ${loan.type === 'kasbon' ? 'Kasbon' : 'Hutang'} #${loan.id}`,
        amount: round2(installment),
        note: `Sisa: Rp ${parseFloat(loan.remaining_amount).toLocaleString('id-ID')}`,
        loan_id: loan.id,
      });
    }
  }

  // ── PPH21 ─────────────────────────────────────────────────────
  let pph21Amount = 0;
  const totalIncome   = incomeLines.reduce((s, l) => s + l.amount, 0);
  const totalDeduct   = deductionLines.reduce((s, l) => s + l.amount, 0);

  if (settings.pph21_enabled) {
    const taxable = Math.max(0, totalIncome - parseFloat(settings.ptkp_monthly || 4500000));
    pph21Amount   = round2(taxable * parseFloat(settings.pph21_rate) / 100);
  }

  const netSalary = round2(totalIncome - totalDeduct - pph21Amount);

  return {
    income_lines:   incomeLines,
    deduction_lines: deductionLines,
    total_income:   round2(totalIncome),
    total_deductions: round2(totalDeduct),
    pph21_amount:   pph21Amount,
    net_salary:     Math.max(0, netSalary),
    attendance:     att,
    loans_deducted: loans.map(l => l.id),
  };
};

// ═══════════════════════════════════════════════════════════════
// THR CALCULATOR
// ═══════════════════════════════════════════════════════════════
const calculateTHR = async (user, employee, settings) => {
  const cfg = settings || await getSettings();
  const monthsWorked  = calcMonthsWorked(employee.join_date);
  const minMonths     = parseInt(cfg.thr_minimum_months) || 6;
  const salaryBase    = parseFloat(employee.salary_base) || 0;

  let eligibility, thrAmount, note;

  if (monthsWorked < minMonths) {
    eligibility = 'not_eligible';
    thrAmount   = 0;
    note        = `Masa kerja ${monthsWorked} bulan < ${minMonths} bulan minimum`;
  } else if (monthsWorked < 12) {
    eligibility = 'proportional';
    thrAmount   = round2((monthsWorked / 12) * salaryBase);
    note        = `Proporsional: ${monthsWorked}/12 × Rp ${salaryBase.toLocaleString('id-ID')}`;
  } else {
    eligibility = 'full';
    thrAmount   = salaryBase;
    note        = `THR penuh 1x gaji pokok`;
  }

  return { eligibility, thr_amount: thrAmount, months_worked: monthsWorked, note };
};

// ═══════════════════════════════════════════════════════════════
// BONUS CALCULATOR (sama logika dengan THR)
// ═══════════════════════════════════════════════════════════════
const calculateBonus = async (user, employee, settings) => {
  const cfg = settings || await getSettings();
  const monthsWorked  = calcMonthsWorked(employee.join_date);
  const minMonths     = parseInt(cfg.bonus_minimum_months) || 6;
  const salaryBase    = parseFloat(employee.salary_base) || 0;

  let eligibility, bonusAmount, note;

  if (monthsWorked < minMonths) {
    eligibility = 'not_eligible';
    bonusAmount = 0;
    note        = `Masa kerja ${monthsWorked} bulan < ${minMonths} bulan minimum`;
  } else if (monthsWorked < 12) {
    eligibility = 'proportional';
    bonusAmount = round2((monthsWorked / 12) * salaryBase);
    note        = `Proporsional: ${monthsWorked}/12 × Rp ${salaryBase.toLocaleString('id-ID')}`;
  } else {
    eligibility = 'full';
    bonusAmount = salaryBase;
    note        = `Bonus penuh 1x gaji pokok`;
  }

  return { eligibility, bonus_amount: bonusAmount, months_worked: monthsWorked, note };
};

// ═══════════════════════════════════════════════════════════════
// INCENTIVE CALCULATOR
// ═══════════════════════════════════════════════════════════════
const calculateIncentive = async (userId, incentiveParameterId) => {
  const rate = await IncentiveEmployeeRate.findOne({
    where: { incentive_parameter_id: incentiveParameterId, user_id: userId },
    include: [{ model: IncentiveParameter, as: 'parameter' }],
  });

  if (!rate) return { amount: 0, rate_percentage: 0, note: 'Tidak ada parameter insentif' };

  const totalSales = parseFloat(rate.parameter.total_sales) || 0;
  const pct        = parseFloat(rate.rate_percentage) || 0;
  const amount     = round2(totalSales * pct / 100);

  return {
    amount,
    rate_percentage: pct,
    total_sales:     totalSales,
    note: `${pct}% × Rp ${totalSales.toLocaleString('id-ID')} = Rp ${amount.toLocaleString('id-ID')}`,
  };
};

// ── Get all eligible employees ─────────────────────────────────
const getActiveEmployees = async (userIds = null) => {
  const where = { is_active: true };
  if (userIds?.length) where.id = { [Op.in]: userIds };

  return User.findAll({
    where,
    include: [{
      model: Employee,
      as: 'employee',
      where: { status: 'active' },
      required: true,
    }],
    attributes: { exclude: ['password_hash', 'refresh_token'] },
  });
};

module.exports = {
  calculateMonthly,
  calculateTHR,
  calculateBonus,
  calculateIncentive,
  getActiveEmployees,
  getSettings,
  getComponents,
  calcMonthsWorked,
  countWorkDays,
};
