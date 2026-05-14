require('dotenv').config();
const { sequelize } = require('../config/database');

// ── Import SEMUA models di awal — SEBELUM sequelize.sync() ────
const {
  User, Employee, Attendance, LeaveRequest, LeaveQuota,
  Payroll, OfficeSetting, EmployeeFace,
  PayrollSetting, PayrollComponent, CompanySetting,
} = require('../models');

// Import incentive models di awal juga agar tabelnya ikut di-sync
const {
  Branch, Position, IncEmployee, SalesChannel, ChannelRate,
  ActivityType, BonusTarget, IncentivePeriod,
  WaSale, MarketplaceSale, MarketplaceShare,
  WebSale, WebShare, EmployeeActivity,
  IncentiveResult, AuditLog,
} = require('../models/incentive');

const { seedDefaultComponents } = require('../controllers/payrollEngineController');
const bcrypt = require('bcryptjs');

const migrate = async () => {
  try {
    console.log('🔄 Running database migration...');

    // sync() sekarang akan include SEMUA model yang sudah di-import di atas
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    // Sync existing HRD tables WITHOUT alter (avoid FK constraint errors)
    await User.sync({ force: false });
    await Employee.sync({ force: false });
    await Attendance.sync({ force: false });
    await LeaveRequest.sync({ force: false });
    await LeaveQuota.sync({ force: false });
    await Payroll.sync({ force: false });
    await OfficeSetting.sync({ force: false });
    await EmployeeFace.sync({ force: false });
    await CompanySetting.sync({ force: false });

    // Sync payroll engine tables (new — safe to alter)
    const {
      PayrollSetting, PayrollComponent, EmployeeAllowance,
      PayrollRun, PayrollItem, LoanManagement,
      IncentiveParameter, IncentiveEmployeeRate,
    } = require('../models');
    await PayrollSetting.sync({ force: false });
    await PayrollComponent.sync({ force: false });
    await EmployeeAllowance.sync({ force: false });
    await PayrollRun.sync({ force: false });
    await PayrollItem.sync({ force: false });
    await LoanManagement.sync({ force: false });
    await IncentiveParameter.sync({ force: false });
    await IncentiveEmployeeRate.sync({ force: false });

    // Sync incentive system tables (new — safe to create)
    await Branch.sync({ force: false });
    await Position.sync({ force: false });
    await IncEmployee.sync({ force: false });
    await SalesChannel.sync({ force: false });
    await ChannelRate.sync({ force: false });
    await ActivityType.sync({ force: false });
    await BonusTarget.sync({ force: false });
    await IncentivePeriod.sync({ force: false });
    await WaSale.sync({ force: false });
    await MarketplaceSale.sync({ force: false });
    await MarketplaceShare.sync({ force: false });
    await WebSale.sync({ force: false });
    await WebShare.sync({ force: false });
    await EmployeeActivity.sync({ force: false });
    await IncentiveResult.sync({ force: false });
    await AuditLog.sync({ force: false });

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('✅ Database tables synced successfully (HRD + Incentive)');

    // ── Seed admin user ──────────────────────────────────────
    const adminExists = await User.findOne({ where: { email: 'admin@hrd.com' } });

    if (!adminExists) {
      console.log('🌱 Seeding initial data...');

      const admin = await User.create({
        name: 'Admin HRD',
        email: 'admin@hrd.com',
        password_hash: 'Admin@123',
        role: 'admin',
      });

      const hr = await User.create({
        name: 'Budi Santoso',
        email: 'hr@hrd.com',
        password_hash: 'Hr@123456',
        role: 'hr',
      });

      const supervisor = await User.create({
        name: 'Dewi Rahayu',
        email: 'supervisor@hrd.com',
        password_hash: 'Super@123',
        role: 'supervisor',
      });

      const emp1 = await User.create({
        name: 'Ahmad Fauzi',
        email: 'ahmad@hrd.com',
        password_hash: 'Emp@123456',
        role: 'employee',
      });

      const emp2 = await User.create({
        name: 'Siti Aminah',
        email: 'siti@hrd.com',
        password_hash: 'Emp@123456',
        role: 'employee',
      });

      // Employee profiles
      await Employee.create({ user_id: hr.id,         nip: 'NIP-001', position: 'HR Manager',   department: 'Human Resources', salary_base: 8000000, join_date: '2020-01-15', status: 'active' });
      await Employee.create({ user_id: supervisor.id, nip: 'NIP-002', position: 'Supervisor',    department: 'Operations',      salary_base: 7500000, join_date: '2020-03-01', status: 'active' });
      await Employee.create({ user_id: emp1.id,       nip: 'NIP-003', position: 'Staff IT',      department: 'Technology',      salary_base: 5500000, join_date: '2021-06-01', status: 'active' });
      await Employee.create({ user_id: emp2.id,       nip: 'NIP-004', position: 'Staff Finance', department: 'Finance',         salary_base: 5000000, join_date: '2022-01-10', status: 'active' });

      // Leave quotas
      const currentYear = new Date().getFullYear();
      for (const u of [hr, supervisor, emp1, emp2]) {
        await LeaveQuota.create({ user_id: u.id, year: currentYear, annual_quota: 12, annual_used: 0, sick_used: 0, carry_over: 0 });
      }

      // Sample leave requests
      await LeaveRequest.create({ user_id: emp1.id, type: 'annual', start_date: `${currentYear}-${String(new Date().getMonth()+1).padStart(2,'0')}-20`, end_date: `${currentYear}-${String(new Date().getMonth()+1).padStart(2,'0')}-22`, total_days: 3, reason: 'Liburan keluarga', status: 'approved', approved_by: hr.id, approved_at: new Date() });
      await LeaveQuota.update({ annual_used: 3 }, { where: { user_id: emp1.id, year: currentYear } });
      await LeaveRequest.create({ user_id: emp2.id, type: 'sick', start_date: `${currentYear}-${String(new Date().getMonth()+2).padStart(2,'0')}-05`, end_date: `${currentYear}-${String(new Date().getMonth()+2).padStart(2,'0')}-06`, total_days: 2, reason: 'Sakit demam', status: 'pending' });

      // Sample payroll
      const prevMonth = new Date(); prevMonth.setMonth(prevMonth.getMonth() - 1);
      const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth()+1).padStart(2,'0')}`;
      const curMonthStr  = `${currentYear}-${String(new Date().getMonth()+1).padStart(2,'0')}`;

      for (const { user: u, base } of [{ user: hr, base: 8000000 }, { user: supervisor, base: 7500000 }, { user: emp1, base: 5500000 }, { user: emp2, base: 5000000 }]) {
        const allowances = 750000;
        const deductions = Math.round((base * 0.01) + (base * 0.02) + Math.max(0, base + allowances - 4500000) * 0.05);
        const totalSalary = base + allowances - deductions;
        const base_json = { employee: { name: u.name }, allowance_items: [], deduction_items: [], calculated_at: new Date().toISOString() };
        await Payroll.create({ user_id: u.id, month: prevMonthStr, salary_base: base, allowances, deductions, overtime_pay: 0, total_salary: totalSalary, status: 'paid', paid_at: new Date(), processed_by: hr.id, details_json: base_json });
        await Payroll.create({ user_id: u.id, month: curMonthStr,  salary_base: base, allowances, deductions, overtime_pay: 0, total_salary: totalSalary, status: 'processed', processed_by: hr.id, details_json: base_json });
      }

      console.log('✅ Initial seed data created');
      console.log('\n📋 Login Credentials:');
      console.log('  Admin:      admin@hrd.com / Admin@123');
      console.log('  HR:         hr@hrd.com / Hr@123456');
      console.log('  Supervisor: supervisor@hrd.com / Super@123');
      console.log('  Employee:   ahmad@hrd.com / Emp@123456');
    } else {
      console.log('ℹ️  Seed data already exists, skipping...');
    }

    // ── Office settings ──────────────────────────────────────
    const officeExists = await OfficeSetting.findOne();
    if (!officeExists) {
      await OfficeSetting.create({ name: 'Kantor HRD Lite', address: 'Jakarta', lat: -6.2088, lng: 106.8456, radius: 100, check_in_start: '06:00', check_in_deadline: '08:05', check_out_start: '15:00', work_hours_required: 8.0, is_active: true });
      console.log('✅ Office settings created');
    }

    // ── Payroll settings ──────────────────────────────────────
    const psExists = await PayrollSetting.findOne();
    if (!psExists) {
      await PayrollSetting.create({});
      console.log('✅ Payroll settings created');
    }

    // ── Payroll components ────────────────────────────────────
    const compCount = await PayrollComponent.count();
    if (compCount === 0) {
      await seedDefaultComponents();
      console.log('✅ Default payroll components seeded (15 komponen)');
    }

    // ── Incentive: Positions ─────────────────────────────────────
    // Seed jabatan SETELAH branches agar bisa link ke branch_id
    // Dilakukan di bawah setelah branches di-seed

    // ── Incentive: Branches ───────────────────────────────────
    // Branch model sudah di-import di atas, tabelnya sudah dibuat oleh sync()
    const branchCount = await Branch.count();
    if (branchCount === 0) {
      await Branch.bulkCreate([
        { code: 'GPRACING', name: 'GP Racing', business_type: 'Online Store Spare Part Racing', sort_order: 1 },
        { code: 'GPDISTRO', name: 'GP Distro', business_type: 'Online Store Fashion',           sort_order: 2 },
      ]);
      console.log('✅ Default branches seeded (GP Racing, GP Distro)');
    }

    // ── Incentive: Positions ─────────────────────────────────────
    const positionCount = await Position.count();
    if (positionCount === 0) {
      // Get branch IDs
      const branchRacing = await Branch.findOne({ where: { code: 'GPRACING' } });
      const branchDistro = await Branch.findOne({ where: { code: 'GPDISTRO' } });

      const jabatanList = [
        'Admin',
        'Customer Service',
        'Sales',
        'Marketing',
        'Packing',
        'Gudang',
        'Driver',
        'Supervisor',
        'Manager',
      ];

      if (branchRacing) {
        for (let i = 0; i < jabatanList.length; i++) {
          await Position.create({ branch_id: branchRacing.id, name: jabatanList[i], level: i < 7 ? 1 : i === 7 ? 2 : 3 });
        }
      }
      if (branchDistro) {
        for (let i = 0; i < jabatanList.length; i++) {
          await Position.create({ branch_id: branchDistro.id, name: jabatanList[i], level: i < 7 ? 1 : i === 7 ? 2 : 3 });
        }
      }
      console.log('✅ Default positions seeded (' + jabatanList.length + ' jabatan per cabang)');
    }

    // ── Incentive: Sales Channels ─────────────────────────────
    const channelCount = await SalesChannel.count();
    if (channelCount === 0) {
      await SalesChannel.bulkCreate([
        { code: 'WA',          name: 'WhatsApp',    percentage: 3.000, input_type: 'per_transaction', sort_order: 1 },
        { code: 'MARKETPLACE', name: 'Marketplace', percentage: 0.500, input_type: 'per_period',      sort_order: 2 },
        { code: 'WEB',         name: 'Website',     percentage: 2.000, input_type: 'per_period',      sort_order: 3 },
      ]);
      console.log('✅ Default sales channels seeded (WA 3%, Marketplace 0.5%, Web 2%)');
    }

    // ── Company Settings ─────────────────────────────────────
    const csExists = await CompanySetting.findOne();
    if (!csExists) {
      await CompanySetting.create({
        company_name:    'GPDISTRO HR Pro',
        company_tagline: 'Human Resource Management System',
        app_name:        'GPDISTRO HR Pro',
        logo_url:        '/logo-gpdistro.png',
        primary_color:   '#e11d48',
      });
      console.log('✅ Company settings seeded (GPDISTRO HR Pro)');
    }

    console.log('\n🎉 Migration complete!');
    console.log('   HRD tables    : users, employees, attendance, leaves, payroll, ...');
    console.log('   Incentive tables: inc_branches, inc_employees, inc_sales_channels, ...');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

migrate();
