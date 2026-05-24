const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { User, Employee, Attendance, LeaveRequest, LeaveQuota, Payroll } = require('../models');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

// ── Helpers ────────────────────────────────────────────────────
const DEPARTMENTS = [
  'Technology', 'Human Resources', 'Finance', 'Operations',
  'Marketing', 'Sales', 'Legal', 'Product', 'Design', 'Management',
];

const calcTenure = (joinDate) => {
  const start = new Date(joinDate);
  const now   = new Date();
  const years  = now.getFullYear() - start.getFullYear();
  const months = now.getMonth() - start.getMonth();
  const total  = years * 12 + months;
  if (total < 1)  return 'Baru bergabung';
  if (total < 12) return `${total} bulan`;
  const y = Math.floor(total / 12);
  const m = total % 12;
  return m ? `${y} tahun ${m} bulan` : `${y} tahun`;
};

// ─────────────────────────────────────────────────────────────
// GET /api/employees  — List all employees with filters
// ─────────────────────────────────────────────────────────────
const getAll = async (req, res, next) => {
  try {
    const { search, department, status, page = 1, limit = 20 } = req.query;

    const userWhere = {};
    const empWhere  = {};

    if (search) {
      userWhere[Op.or] = [
        { name:  { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
      empWhere[Op.or] = [
        { nip:      { [Op.like]: `%${search}%` } },
        { position: { [Op.like]: `%${search}%` } },
      ];
    }

    if (department) empWhere.department = department;
    if (status)     empWhere.status     = status;

    const { count, rows } = await User.findAndCountAll({
      where: { ...userWhere, role: { [Op.in]: ['employee', 'hr', 'supervisor'] } },
      include: [{
        model: Employee,
        as: 'employee',
        where: empWhere,
        required: true,
      }],
      order: [['name', 'ASC']],
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      attributes: { exclude: ['password_hash', 'refresh_token'] },
    });

    // Add tenure to each
    const employees = rows.map(u => ({
      ...u.toJSON(),
      employee: {
        ...u.employee.toJSON(),
        tenure: calcTenure(u.employee.join_date),
      },
    }));

    // Department breakdown for sidebar
    const allEmps = await Employee.findAll({ attributes: ['department', 'status'] });
    const deptMap = {};
    allEmps.forEach(e => {
      if (!deptMap[e.department]) deptMap[e.department] = { total: 0, active: 0 };
      deptMap[e.department].total++;
      if (e.status === 'active') deptMap[e.department].active++;
    });

    return res.json({
      success: true,
      data: {
        employees,
        departments: deptMap,
        pagination: {
          total: count, page: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// GET /api/employees/:id  — Full employee profile
// ─────────────────────────────────────────────────────────────
const getOne = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash', 'refresh_token'] },
      include: [{
        model: Employee,
        as: 'employee',
        required: false,
      }],
    });

    if (!user) return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan' });

    // RBAC: employee can only view own profile
    if (req.user.role === 'employee' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    const year = new Date().getFullYear();

    // Stats for profile
    const [attStats, leaveQuota, lastPayroll] = await Promise.all([
      // Attendance this month
      Attendance.findAll({
        where: {
          user_id: user.id,
          date: {
            [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
              .toISOString().split('T')[0],
          },
        },
      }),
      // Leave quota
      LeaveQuota.findOne({ where: { user_id: user.id, year } }),
      // Last payroll
      Payroll.findOne({
        where: { user_id: user.id },
        order: [['month', 'DESC']],
      }),
    ]);

    const stats = {
      attendance_this_month: {
        present:    attStats.filter(a => a.status === 'present').length,
        late:       attStats.filter(a => a.status === 'late').length,
        total_days: attStats.length,
      },
      leave_quota: leaveQuota ? {
        remaining: Math.max(0, leaveQuota.annual_quota + leaveQuota.carry_over - leaveQuota.annual_used),
        used:      leaveQuota.annual_used,
        total:     leaveQuota.annual_quota,
      } : null,
      last_salary: lastPayroll ? {
        month:  lastPayroll.month,
        amount: lastPayroll.total_salary,
        status: lastPayroll.status,
      } : null,
      tenure: user.employee ? calcTenure(user.employee.join_date) : null,
    };

    return res.json({ success: true, data: { user, stats } });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// POST /api/employees  — Create new employee (Admin/HR)
// ─────────────────────────────────────────────────────────────
const create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await t.rollback();
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      name, email, password = 'HRD@123456', role = 'employee',
      nip, position, department, salary_base, join_date, status = 'active',
      phone, address, emergency_contact, emergency_phone,
    } = req.body;

    // Check email & NIP unique
    const [emailExists, nipExists] = await Promise.all([
      User.findOne({ where: { email: email.toLowerCase() } }),
      Employee.findOne({ where: { nip } }),
    ]);

    if (emailExists) {
      await t.rollback();
      return res.status(409).json({ success: false, message: 'Email sudah digunakan', code: 'EMAIL_EXISTS' });
    }
    if (nipExists) {
      await t.rollback();
      return res.status(409).json({ success: false, message: 'NIP sudah digunakan', code: 'NIP_EXISTS' });
    }

    // Create user account
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash: password,
      role,
    }, { transaction: t });

    // Create employee profile
    const employee = await Employee.create({
      user_id: user.id,
      nip: nip.trim(),
      position: position.trim(),
      department: department.trim(),
      salary_base: parseFloat(salary_base) || 0,
      join_date,
      status,
      phone:             phone             || null,
      address:           address           || null,
      emergency_contact: emergency_contact || null,
      emergency_phone:   emergency_phone   || null,
    }, { transaction: t });

    // Auto-create leave quota for current year
    const year = new Date().getFullYear();
    await LeaveQuota.create({
      user_id: user.id,
      year,
      annual_quota: 12,
      annual_used: 0,
      sick_used: 0,
      carry_over: 0,
    }, { transaction: t });

    await t.commit();

    return res.status(201).json({
      success: true,
      message: `Karyawan ${name} berhasil ditambahkan`,
      data: { user: { ...user.toJSON(), employee } },
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/employees/:id  — Update employee (Admin/HR or self)
// ─────────────────────────────────────────────────────────────
const update = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await t.rollback();
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = parseInt(req.params.id);
    const isSelf = req.user.id === userId;
    const isHRAdmin = ['admin', 'hr'].includes(req.user.role);

    if (!isSelf && !isHRAdmin) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    const user     = await User.findByPk(userId, { transaction: t });
    const employee = await Employee.findOne({ where: { user_id: userId }, transaction: t });

    if (!user || !employee) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan' });
    }

    const {
      name, role,
      nip, position, department, salary_base, join_date, status,
      phone, address, emergency_contact, emergency_phone,
    } = req.body;

    // NIP uniqueness check (if changing)
    if (nip && nip !== employee.nip) {
      const nipExists = await Employee.findOne({ where: { nip, id: { [Op.ne]: employee.id } } });
      if (nipExists) {
        await t.rollback();
        return res.status(409).json({ success: false, message: 'NIP sudah digunakan karyawan lain' });
      }
    }

    // Update user
    const userUpdates = {};
    if (name) userUpdates.name = name.trim();
    // Only admin can change role
    if (role && req.user.role === 'admin') userUpdates.role = role;
    if (Object.keys(userUpdates).length) await user.update(userUpdates, { transaction: t });

    // Update employee — employees can only update own contact info, HR/admin can update all
    const empUpdates = {};
    if (phone             !== undefined) empUpdates.phone             = phone;
    if (address           !== undefined) empUpdates.address           = address;
    if (emergency_contact !== undefined) empUpdates.emergency_contact = emergency_contact;
    if (emergency_phone   !== undefined) empUpdates.emergency_phone   = emergency_phone;

    if (isHRAdmin) {
      if (nip)          empUpdates.nip          = nip.trim();
      if (position)     empUpdates.position     = position.trim();
      if (department)   empUpdates.department   = department.trim();
      if (salary_base)  empUpdates.salary_base  = parseFloat(salary_base);
      if (join_date)    empUpdates.join_date    = join_date;
      if (status)       empUpdates.status       = status;
    }

    if (Object.keys(empUpdates).length) await employee.update(empUpdates, { transaction: t });
    await t.commit();

    return res.json({
      success: true,
      message: 'Data karyawan berhasil diperbarui',
      data: { user: { ...user.toJSON(), employee } },
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/employees/:id/deactivate  — Soft deactivate
// ─────────────────────────────────────────────────────────────
const deactivate = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const user     = await User.findByPk(req.params.id, { transaction: t });
    const employee = await Employee.findOne({ where: { user_id: req.params.id }, transaction: t });

    if (!user || !employee) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan' });
    }

    if (user.id === req.user.id) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Tidak bisa menonaktifkan akun sendiri' });
    }

    const { reason, status: newStatus = 'terminated' } = req.body;

    await user.update({ is_active: false }, { transaction: t });
    await employee.update({ status: newStatus }, { transaction: t });
    await t.commit();

    return res.json({
      success: true,
      message: `Karyawan ${user.name} berhasil dinonaktifkan`,
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/employees/:id/reactivate
// ─────────────────────────────────────────────────────────────
const reactivate = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const user     = await User.findByPk(req.params.id, { transaction: t });
    const employee = await Employee.findOne({ where: { user_id: req.params.id }, transaction: t });
    if (!user || !employee) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan' });
    }
    await user.update({ is_active: true }, { transaction: t });
    await employee.update({ status: 'active' }, { transaction: t });
    await t.commit();
    return res.json({ success: true, message: `Karyawan ${user.name} berhasil diaktifkan kembali` });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/employees/stats  — Summary stats for dashboard
// ─────────────────────────────────────────────────────────────
const getStats = async (req, res, next) => {
  try {
    const employees = await Employee.findAll({
      include: [{ model: User, as: 'user', attributes: ['is_active', 'role'] }],
    });

    const deptBreakdown = {};
    employees.forEach(e => {
      if (!deptBreakdown[e.department]) deptBreakdown[e.department] = 0;
      deptBreakdown[e.department]++;
    });

    const stats = {
      total:       employees.length,
      active:      employees.filter(e => e.status === 'active').length,
      inactive:    employees.filter(e => e.status !== 'active').length,
      on_leave:    employees.filter(e => e.status === 'on_leave').length,
      terminated:  employees.filter(e => e.status === 'terminated').length,
      by_dept:     deptBreakdown,
      by_role: {
        employee:   employees.filter(e => e.user?.role === 'employee').length,
        hr:         employees.filter(e => e.user?.role === 'hr').length,
        supervisor: employees.filter(e => e.user?.role === 'supervisor').length,
      },
      // New hires this month
      new_this_month: employees.filter(e => {
        const joined = new Date(e.join_date);
        const now    = new Date();
        return joined.getMonth() === now.getMonth() && joined.getFullYear() === now.getFullYear();
      }).length,
    };

    return res.json({ success: true, data: { stats } });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// GET /api/employees/departments  — Department list
// ─────────────────────────────────────────────────────────────
const getDepartments = async (req, res, next) => {
  try {
    const rows = await Employee.findAll({
      attributes: ['department'],
      group: ['department'],
    });
    const depts = rows.map(r => r.department).sort();
    return res.json({ success: true, data: { departments: depts, suggestions: DEPARTMENTS } });
  } catch (err) { next(err); }
};


// ── Reset Password (admin/HR only) ───────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    
    // Use bcrypt to hash password
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(new_password, 10);
    await user.update({ password_hash: hash });
    return res.json({ success: true, message: 'Password berhasil direset' });
  } catch (err) { next(err); }
};

module.exports = {
  getAll, getOne, create, update, resetPassword,
  deactivate, reactivate, getStats, getDepartments,
};
