require('dotenv').config();
const { sequelize } = require('../config/database');
const { User, Employee, Attendance, LeaveRequest, LeaveQuota, Payroll, OfficeSetting, EmployeeFace, PayrollSetting, PayrollComponent } = require('../models');
const { seedDefaultComponents } = require('../controllers/payrollEngineController');
const bcrypt = require('bcryptjs');

const migrate = async () => {
  try {
    console.log('🔄 Running database migration...');

    await sequelize.sync({ force: false, alter: true });

    console.log('✅ Database tables synced successfully');

    // Seed initial admin user
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

      // Create employee profiles
      await Employee.create({
        user_id: hr.id,
        nip: 'NIP-001',
        position: 'HR Manager',
        department: 'Human Resources',
        salary_base: 8000000,
        join_date: '2020-01-15',
        status: 'active',
      });

      await Employee.create({
        user_id: supervisor.id,
        nip: 'NIP-002',
        position: 'Supervisor',
        department: 'Operations',
        salary_base: 7500000,
        join_date: '2020-03-01',
        status: 'active',
      });

      await Employee.create({
        user_id: emp1.id,
        nip: 'NIP-003',
        position: 'Staff IT',
        department: 'Technology',
        salary_base: 5500000,
        join_date: '2021-06-01',
        status: 'active',
      });

      await Employee.create({
        user_id: emp2.id,
        nip: 'NIP-004',
        position: 'Staff Finance',
        department: 'Finance',
        salary_base: 5000000,
        join_date: '2022-01-10',
        status: 'active',
      });

      // Seed leave quotas for current year
      const currentYear = new Date().getFullYear();
      const usersWithQuota = [hr, supervisor, emp1, emp2];
      for (const u of usersWithQuota) {
        await LeaveQuota.create({
          user_id: u.id,
          year: currentYear,
          annual_quota: 12,
          annual_used: 0,
          sick_used: 0,
          carry_over: 0,
        });
      }

      // Seed a sample approved leave for demo
      await LeaveRequest.create({
        user_id: emp1.id,
        type: 'annual',
        start_date: new Date(currentYear, new Date().getMonth(), 20).toISOString().split('T')[0],
        end_date: new Date(currentYear, new Date().getMonth(), 22).toISOString().split('T')[0],
        total_days: 3,
        reason: 'Liburan keluarga ke Bali',
        status: 'approved',
        approved_by: hr.id,
        approved_at: new Date(),
      });

      // Update quota usage for the approved leave
      await LeaveQuota.update(
        { annual_used: 3 },
        { where: { user_id: emp1.id, year: currentYear } }
      );

      // Seed a pending leave request for demo
      await LeaveRequest.create({
        user_id: emp2.id,
        type: 'sick',
        start_date: new Date(currentYear, new Date().getMonth() + 1, 5).toISOString().split('T')[0],
        end_date: new Date(currentYear, new Date().getMonth() + 1, 6).toISOString().split('T')[0],
        total_days: 2,
        reason: 'Sakit demam dan perlu istirahat total',
        status: 'pending',
      });

      // Seed payroll records for last 2 months
      const prevMonthDate = new Date(currentYear, new Date().getMonth() - 1, 1);
      const prevMonthStr  = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
      const curMonthStr   = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

      const payrollUsers = [
        { user: hr,         base: 8000000 },
        { user: supervisor, base: 7500000 },
        { user: emp1,       base: 5500000 },
        { user: emp2,       base: 5000000 },
      ];

      for (const { user: u, base } of payrollUsers) {
        const allowances  = 750000;
        const deductions  = Math.round((base * 0.01) + (base * 0.02) + Math.max(0, base + allowances - 4500000) * 0.05);
        const totalSalary = base + allowances - deductions;

        // Previous month - paid
        await Payroll.create({
          user_id: u.id,
          month: prevMonthStr,
          salary_base:  base,
          allowances:   allowances,
          deductions:   deductions,
          overtime_pay: 0,
          total_salary: totalSalary,
          status: 'paid',
          paid_at: new Date(),
          processed_by: hr.id,
          details_json: {
            employee: { name: u.name, nip: '', position: '', department: '' },
            attendance_summary: { present: 20, late: 1, absent: 0, leave: 1, total_hours: 168 },
            allowance_items: [
              { name: 'Tunjangan Transport', amount: 300000 },
              { name: 'Tunjangan Makan',     amount: 450000 },
            ],
            deduction_items: [
              { name: 'BPJS Kesehatan (1%)', amount: Math.round(base * 0.01) },
              { name: 'BPJS TK / JHT (2%)', amount: Math.round(base * 0.02) },
              { name: 'PPH 21 (5%)',         amount: Math.round(Math.max(0, base + allowances - 4500000) * 0.05) },
            ],
            gross_salary: base + allowances,
            calculated_at: new Date().toISOString(),
          },
        });

        // Current month - processed
        await Payroll.create({
          user_id: u.id,
          month: curMonthStr,
          salary_base:  base,
          allowances:   allowances,
          deductions:   deductions,
          overtime_pay: 0,
          total_salary: totalSalary,
          status: 'processed',
          processed_by: hr.id,
          details_json: {
            employee: { name: u.name, nip: '', position: '', department: '' },
            attendance_summary: { present: 18, late: 2, absent: 0, leave: 0, total_hours: 152 },
            allowance_items: [
              { name: 'Tunjangan Transport', amount: 300000 },
              { name: 'Tunjangan Makan',     amount: 450000 },
              { name: 'Potongan Terlambat (2x)', amount: -50000 },
            ],
            deduction_items: [
              { name: 'BPJS Kesehatan (1%)', amount: Math.round(base * 0.01) },
              { name: 'BPJS TK / JHT (2%)', amount: Math.round(base * 0.02) },
              { name: 'PPH 21 (5%)',         amount: Math.round(Math.max(0, base + allowances - 4500000) * 0.05) },
            ],
            gross_salary: base + allowances,
            calculated_at: new Date().toISOString(),
          },
        });
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

    // Seed office settings if not exists
    const officeExists = await OfficeSetting.findOne();
    if (!officeExists) {
      await OfficeSetting.create({
        name: 'Kantor HRD Lite',
        address: 'Jl. Kantor No. 1, Jakarta',
        lat: -6.2088,
        lng: 106.8456,
        radius: 100,
        check_in_start: '06:00',
        check_in_deadline: '08:05',
        check_out_start: '15:00',
        work_hours_required: 8.0,
        is_active: true,
      });
      console.log('✅ Office settings created (lat:-6.2088, lng:106.8456, radius:100m)');
      console.log('   → Ubah koordinat kantor di menu Settings > Pengaturan Kantor');
    }

    // Seed payroll settings
    const psExists = await PayrollSetting.findOne();
    if (!psExists) {
      await PayrollSetting.create({});
      console.log('✅ Payroll settings created (default)');
    }

    // Seed default payroll components
    const compCount = await PayrollComponent.count();
    if (compCount === 0) {
      await seedDefaultComponents();
      console.log('✅ Default payroll components seeded (15 komponen)');
    }

    console.log('\n🎉 Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrate();
