require('dotenv').config();
const { sequelize } = require('../config/database');
const { User, Employee, Attendance, LeaveRequest, Payroll } = require('../models');
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

      console.log('✅ Initial seed data created');
      console.log('\n📋 Login Credentials:');
      console.log('  Admin:      admin@hrd.com / Admin@123');
      console.log('  HR:         hr@hrd.com / Hr@123456');
      console.log('  Supervisor: supervisor@hrd.com / Super@123');
      console.log('  Employee:   ahmad@hrd.com / Emp@123456');
    } else {
      console.log('ℹ️  Seed data already exists, skipping...');
    }

    console.log('\n🎉 Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrate();
