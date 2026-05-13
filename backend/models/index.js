const User               = require('./User');
const Employee           = require('./Employee');
const Attendance         = require('./Attendance');
const LeaveRequest       = require('./LeaveRequest');
const LeaveQuota         = require('./LeaveQuota');
const OfficeSetting      = require('./OfficeSetting');
const EmployeeFace       = require('./EmployeeFace');
const Payroll            = require('./Payroll'); // legacy
const CompanySetting     = require('./CompanySetting');
const PayrollSetting     = require('./PayrollSetting');
const PayrollComponent   = require('./PayrollComponent');
const EmployeeAllowance  = require('./EmployeeAllowance');
const PayrollRun         = require('./PayrollRun');
const PayrollItem        = require('./PayrollItem');
const LoanManagement     = require('./LoanManagement');
const { IncentiveParameter, IncentiveEmployeeRate } = require('./IncentiveParameter');

// User <-> Employee
User.hasOne(Employee, { foreignKey: 'user_id', as: 'employee' });
Employee.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
// User <-> Attendance
User.hasMany(Attendance, { foreignKey: 'user_id', as: 'attendances' });
Attendance.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
// User <-> LeaveRequest
User.hasMany(LeaveRequest, { foreignKey: 'user_id', as: 'leaveRequests' });
LeaveRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
LeaveRequest.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });
// User <-> LeaveQuota
User.hasMany(LeaveQuota, { foreignKey: 'user_id', as: 'leaveQuotas' });
LeaveQuota.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
// User <-> EmployeeFace
User.hasOne(EmployeeFace, { foreignKey: 'user_id', as: 'face' });
EmployeeFace.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
// Legacy Payroll
User.hasMany(Payroll, { foreignKey: 'user_id', as: 'payrolls' });
Payroll.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
// PayrollRun
User.hasMany(PayrollRun, { foreignKey: 'generated_by', as: 'generatedRuns' });
PayrollRun.hasMany(PayrollItem, { foreignKey: 'payroll_run_id', as: 'items' });
PayrollItem.belongsTo(PayrollRun, { foreignKey: 'payroll_run_id', as: 'run' });
// PayrollItem <-> User
User.hasMany(PayrollItem, { foreignKey: 'user_id', as: 'payrollItems' });
PayrollItem.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
// PayrollComponent <-> EmployeeAllowance
PayrollComponent.hasMany(EmployeeAllowance, { foreignKey: 'component_id', as: 'employeeValues' });
EmployeeAllowance.belongsTo(PayrollComponent, { foreignKey: 'component_id', as: 'component' });
User.hasMany(EmployeeAllowance, { foreignKey: 'user_id', as: 'allowances' });
EmployeeAllowance.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
// LoanManagement
User.hasMany(LoanManagement, { foreignKey: 'user_id', as: 'loans' });
LoanManagement.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(LoanManagement, { foreignKey: 'approved_by', as: 'approvedLoans' });
// IncentiveEmployeeRate <-> User
User.hasMany(IncentiveEmployeeRate, { foreignKey: 'user_id', as: 'incentiveRates' });
IncentiveEmployeeRate.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  User, Employee, Attendance, LeaveRequest, LeaveQuota,
  OfficeSetting, EmployeeFace, Payroll,
  PayrollSetting, PayrollComponent, EmployeeAllowance,
  PayrollRun, PayrollItem, LoanManagement,
  IncentiveParameter, IncentiveEmployeeRate,
  CompanySetting,
};
