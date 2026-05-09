const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/database');
const { User, Employee, Attendance, LeaveRequest, LeaveQuota, Payroll } = require('../models');

// ── Helpers ────────────────────────────────────────────────────
const getMonthRange = (month) => {
  const [y, m] = month.split('-');
  const start = `${y}-${m}-01`;
  const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
  const end = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
};

const getYearMonths = (year) =>
  Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);

// ─────────────────────────────────────────────────────────────
// GET /api/reports/overview?month=YYYY-MM
// Full dashboard overview — used by Reports page top section
// ─────────────────────────────────────────────────────────────
const getOverview = async (req, res, next) => {
  try {
    const month = req.query.month || (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })();

    const { start, end } = getMonthRange(month);

    const [
      totalEmployees,
      activeEmployees,
      attendances,
      leaveRequests,
      payrolls,
    ] = await Promise.all([
      Employee.count(),
      Employee.count({ where: { status: 'active' } }),
      Attendance.findAll({ where: { date: { [Op.between]: [start, end] } } }),
      LeaveRequest.findAll({
        where: {
          status: { [Op.in]: ['pending', 'approved'] },
          [Op.or]: [
            { start_date: { [Op.between]: [start, end] } },
            { end_date:   { [Op.between]: [start, end] } },
          ],
        },
      }),
      Payroll.findAll({ where: { month } }),
    ]);

    // Attendance rate
    const workDays = (() => {
      let count = 0;
      const cur = new Date(start);
      const endDate = new Date(end);
      while (cur <= endDate) {
        if (cur.getDay() !== 0 && cur.getDay() !== 6) count++;
        cur.setDate(cur.getDate() + 1);
      }
      return count;
    })();

    const totalExpected = workDays * activeEmployees;
    const totalPresent  = attendances.filter(a => a.status === 'present' || a.status === 'late').length;
    const totalLate     = attendances.filter(a => a.status === 'late').length;
    const attendanceRate = totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : 0;

    const totalPayroll  = payrolls.reduce((s, p) => s + parseFloat(p.total_salary), 0);
    const paidPayroll   = payrolls.filter(p => p.status === 'paid').length;

    return res.json({
      success: true,
      data: {
        month,
        employees: { total: totalEmployees, active: activeEmployees },
        attendance: {
          total_days: workDays,
          total_present: totalPresent,
          total_late: totalLate,
          rate: attendanceRate,
          total_expected: totalExpected,
        },
        leaves: {
          pending:  leaveRequests.filter(l => l.status === 'pending').length,
          approved: leaveRequests.filter(l => l.status === 'approved').length,
        },
        payroll: {
          total_amount: Math.round(totalPayroll),
          total_records: payrolls.length,
          paid: paidPayroll,
          unpaid: payrolls.length - paidPayroll,
        },
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/attendance?month=YYYY-MM
// Detailed attendance analytics with department breakdown
// ─────────────────────────────────────────────────────────────
const getAttendanceReport = async (req, res, next) => {
  try {
    const month = req.query.month || (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })();
    const { start, end } = getMonthRange(month);

    // Get all attendances with user+employee
    const attendances = await Attendance.findAll({
      where: { date: { [Op.between]: [start, end] } },
      include: [{
        model: User, as: 'user',
        attributes: ['id', 'name'],
        include: [{ model: Employee, as: 'employee', attributes: ['department', 'position', 'nip'], required: false }],
      }],
      order: [['date', 'ASC']],
    });

    // Per-person summary
    const byUser = {};
    attendances.forEach(a => {
      const uid = a.user_id;
      if (!byUser[uid]) {
        byUser[uid] = {
          user_id: uid,
          name:       a.user?.name,
          department: a.user?.employee?.department,
          position:   a.user?.employee?.position,
          nip:        a.user?.employee?.nip,
          present: 0, late: 0, absent: 0, total_hours: 0,
        };
      }
      if (a.status === 'present') byUser[uid].present++;
      if (a.status === 'late')    { byUser[uid].late++; byUser[uid].present++; }
      if (a.status === 'absent')  byUser[uid].absent++;
      byUser[uid].total_hours += parseFloat(a.work_hours || 0);
    });

    // Department breakdown
    const byDept = {};
    Object.values(byUser).forEach(u => {
      const d = u.department || 'Unknown';
      if (!byDept[d]) byDept[d] = { department: d, present: 0, late: 0, absent: 0, employees: 0 };
      byDept[d].present += u.present;
      byDept[d].late    += u.late;
      byDept[d].absent  += u.absent;
      byDept[d].employees++;
    });

    // Daily trend (last 14 days max)
    const dailyMap = {};
    attendances.forEach(a => {
      if (!dailyMap[a.date]) dailyMap[a.date] = { date: a.date, present: 0, late: 0, absent: 0 };
      if (a.status === 'present') dailyMap[a.date].present++;
      if (a.status === 'late')    { dailyMap[a.date].late++; dailyMap[a.date].present++; }
      if (a.status === 'absent')  dailyMap[a.date].absent++;
    });
    const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      success: true,
      data: {
        month,
        by_employee: Object.values(byUser).sort((a, b) => b.present - a.present),
        by_department: Object.values(byDept).sort((a, b) => b.present - a.present),
        daily_trend: dailyTrend,
        summary: {
          total_checkins:  attendances.length,
          avg_hours: attendances.length
            ? (attendances.reduce((s, a) => s + parseFloat(a.work_hours || 0), 0) / attendances.length).toFixed(1)
            : 0,
          most_punctual: Object.values(byUser)
            .filter(u => u.late === 0 && u.present > 0)
            .sort((a, b) => b.present - a.present)
            .slice(0, 3)
            .map(u => u.name),
        },
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/leaves?year=YYYY
// Leave analytics — type breakdown, monthly trend, top users
// ─────────────────────────────────────────────────────────────
const getLeaveReport = async (req, res, next) => {
  try {
    const year = req.query.year || new Date().getFullYear();

    const leaves = await LeaveRequest.findAll({
      where: {
        created_at: {
          [Op.between]: [
            new Date(`${year}-01-01`),
            new Date(`${year}-12-31T23:59:59`),
          ],
        },
      },
      include: [{
        model: User, as: 'user',
        attributes: ['id', 'name'],
        include: [{ model: Employee, as: 'employee', attributes: ['department'], required: false }],
      }],
    });

    // By type
    const byType = {};
    leaves.forEach(l => {
      if (!byType[l.type]) byType[l.type] = { type: l.type, total: 0, approved: 0, rejected: 0, days: 0 };
      byType[l.type].total++;
      byType[l.type].days += l.total_days;
      if (l.status === 'approved') byType[l.type].approved++;
      if (l.status === 'rejected') byType[l.type].rejected++;
    });

    // Monthly trend
    const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0');
      const monthLeaves = leaves.filter(l => l.created_at &&
        new Date(l.created_at).getMonth() === i);
      return {
        month: `${year}-${m}`,
        count: monthLeaves.length,
        days:  monthLeaves.reduce((s, l) => s + l.total_days, 0),
      };
    });

    // Top leave takers
    const byUser = {};
    leaves.filter(l => l.status === 'approved').forEach(l => {
      const uid = l.user_id;
      if (!byUser[uid]) byUser[uid] = {
        name: l.user?.name, department: l.user?.employee?.department, days: 0,
      };
      byUser[uid].days += l.total_days;
    });
    const topUsers = Object.values(byUser).sort((a, b) => b.days - a.days).slice(0, 5);

    return res.json({
      success: true,
      data: {
        year,
        total_requests: leaves.length,
        total_approved: leaves.filter(l => l.status === 'approved').length,
        total_pending:  leaves.filter(l => l.status === 'pending').length,
        by_type:        Object.values(byType),
        monthly_trend:  monthlyTrend,
        top_leave_users: topUsers,
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/payroll?year=YYYY
// Payroll analytics — monthly totals, dept breakdown, trends
// ─────────────────────────────────────────────────────────────
const getPayrollReport = async (req, res, next) => {
  try {
    const year = req.query.year || new Date().getFullYear();

    const payrolls = await Payroll.findAll({
      where: { month: { [Op.like]: `${year}-%` } },
      include: [{
        model: User, as: 'user',
        attributes: ['id', 'name'],
        include: [{ model: Employee, as: 'employee', attributes: ['department', 'position'], required: false }],
      }],
      order: [['month', 'ASC']],
    });

    // Monthly totals
    const months = getYearMonths(year);
    const monthlyTotals = months.map(m => {
      const mPayrolls = payrolls.filter(p => p.month === m);
      return {
        month: m,
        total_salary:    mPayrolls.reduce((s, p) => s + parseFloat(p.total_salary), 0),
        total_deductions: mPayrolls.reduce((s, p) => s + parseFloat(p.deductions), 0),
        count:  mPayrolls.length,
        paid:   mPayrolls.filter(p => p.status === 'paid').length,
      };
    });

    // Dept breakdown (latest month with data)
    const latestMonth = [...payrolls].sort((a, b) => b.month.localeCompare(a.month))[0]?.month;
    const byDept = {};
    if (latestMonth) {
      payrolls.filter(p => p.month === latestMonth).forEach(p => {
        const dept = p.user?.employee?.department || 'Unknown';
        if (!byDept[dept]) byDept[dept] = { department: dept, total: 0, count: 0, avg: 0 };
        byDept[dept].total += parseFloat(p.total_salary);
        byDept[dept].count++;
      });
      Object.values(byDept).forEach(d => { d.avg = Math.round(d.total / d.count); });
    }

    // Year totals
    const yearTotal     = payrolls.reduce((s, p) => s + parseFloat(p.total_salary), 0);
    const yearDeductions = payrolls.reduce((s, p) => s + parseFloat(p.deductions), 0);
    const yearAllowances = payrolls.reduce((s, p) => s + parseFloat(p.allowances), 0);

    return res.json({
      success: true,
      data: {
        year,
        year_total:      Math.round(yearTotal),
        year_deductions: Math.round(yearDeductions),
        year_allowances: Math.round(yearAllowances),
        monthly_totals:  monthlyTotals,
        by_department:   Object.values(byDept).sort((a, b) => b.total - a.total),
        latest_month:    latestMonth,
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/employees?year=YYYY
// Employee analytics — turnover, tenure buckets, dept growth
// ─────────────────────────────────────────────────────────────
const getEmployeeReport = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const employees = await Employee.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'role', 'is_active'] }],
    });

    // Tenure buckets
    const now = new Date();
    const tenureBuckets = { '< 1 tahun': 0, '1-2 tahun': 0, '2-5 tahun': 0, '> 5 tahun': 0 };
    employees.filter(e => e.status === 'active').forEach(e => {
      const months = Math.floor((now - new Date(e.join_date)) / (1000 * 60 * 60 * 24 * 30));
      if (months < 12)       tenureBuckets['< 1 tahun']++;
      else if (months < 24)  tenureBuckets['1-2 tahun']++;
      else if (months < 60)  tenureBuckets['2-5 tahun']++;
      else                   tenureBuckets['> 5 tahun']++;
    });

    // Monthly joiners this year
    const monthlyJoiners = getYearMonths(year).map(m => {
      const [y, mo] = m.split('-').map(Number);
      const count = employees.filter(e => {
        const d = new Date(e.join_date);
        return d.getFullYear() === y && d.getMonth() + 1 === mo;
      }).length;
      return { month: m, count };
    });

    // Dept distribution
    const deptDist = {};
    employees.filter(e => e.status === 'active').forEach(e => {
      if (!deptDist[e.department]) deptDist[e.department] = 0;
      deptDist[e.department]++;
    });

    return res.json({
      success: true,
      data: {
        year,
        total:       employees.length,
        active:      employees.filter(e => e.status === 'active').length,
        terminated:  employees.filter(e => e.status === 'terminated').length,
        tenure_buckets:   Object.entries(tenureBuckets).map(([label, count]) => ({ label, count })),
        monthly_joiners:  monthlyJoiners,
        dept_distribution: Object.entries(deptDist)
          .map(([dept, count]) => ({ dept, count }))
          .sort((a, b) => b.count - a.count),
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/export?type=attendance&month=YYYY-MM
// JSON export endpoint (frontend converts to CSV)
// ─────────────────────────────────────────────────────────────
const exportData = async (req, res, next) => {
  try {
    const { type, month, year } = req.query;

    let data = [];
    let filename = '';

    if (type === 'attendance' && month) {
      const { start, end } = getMonthRange(month);
      const records = await Attendance.findAll({
        where: { date: { [Op.between]: [start, end] } },
        include: [{
          model: User, as: 'user',
          include: [{ model: Employee, as: 'employee', required: false }],
        }],
        order: [['date', 'ASC'], ['user_id', 'ASC']],
      });

      data = records.map(a => ({
        NIP:        a.user?.employee?.nip    || '',
        Nama:       a.user?.name             || '',
        Departemen: a.user?.employee?.department || '',
        Jabatan:    a.user?.employee?.position   || '',
        Tanggal:    a.date,
        'Jam Masuk':  a.check_in  ? a.check_in.slice(0, 5)  : '',
        'Jam Keluar': a.check_out ? a.check_out.slice(0, 5) : '',
        'Jam Kerja':  a.work_hours || '',
        Status:     a.status,
        'GPS Masuk': a.check_in_lat ? `${a.check_in_lat},${a.check_in_lng}` : '',
      }));
      filename = `absensi_${month}.csv`;
    }

    if (type === 'payroll' && month) {
      const records = await Payroll.findAll({
        where: { month },
        include: [{
          model: User, as: 'user',
          include: [{ model: Employee, as: 'employee', required: false }],
        }],
        order: [['total_salary', 'DESC']],
      });

      data = records.map(p => ({
        NIP:        p.user?.employee?.nip    || '',
        Nama:       p.user?.name             || '',
        Departemen: p.user?.employee?.department || '',
        Jabatan:    p.user?.employee?.position   || '',
        Bulan:      p.month,
        'Gaji Pokok':    p.salary_base,
        'Tunjangan':     p.allowances,
        'Lembur':        p.overtime_pay,
        'Potongan':      p.deductions,
        'Gaji Bersih':   p.total_salary,
        Status:          p.status,
        'Tanggal Bayar': p.paid_at ? new Date(p.paid_at).toLocaleDateString('id-ID') : '',
      }));
      filename = `payroll_${month}.csv`;
    }

    if (type === 'employees') {
      const records = await User.findAll({
        attributes: { exclude: ['password_hash', 'refresh_token'] },
        include: [{ model: Employee, as: 'employee', required: true }],
        order: [['name', 'ASC']],
      });

      data = records.map(u => ({
        NIP:          u.employee?.nip        || '',
        Nama:         u.name,
        Email:        u.email,
        Role:         u.role,
        Jabatan:      u.employee?.position   || '',
        Departemen:   u.employee?.department || '',
        'Gaji Pokok': u.employee?.salary_base || 0,
        'Tanggal Bergabung': u.employee?.join_date || '',
        Status:       u.employee?.status || '',
        Telepon:      u.employee?.phone || '',
      }));
      filename = `karyawan_${new Date().toISOString().split('T')[0]}.csv`;
    }

    return res.json({ success: true, data: { rows: data, filename, count: data.length } });
  } catch (err) { next(err); }
};

module.exports = {
  getOverview, getAttendanceReport, getLeaveReport,
  getPayrollReport, getEmployeeReport, exportData,
};
