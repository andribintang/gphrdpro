const User = require('./User');
const Employee = require('./Employee');
const Attendance = require('./Attendance');
const LeaveRequest = require('./LeaveRequest');
const Payroll = require('./Payroll');

// User <-> Employee (1:1)
User.hasOne(Employee, { foreignKey: 'user_id', as: 'employee' });
Employee.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> Attendance (1:Many)
User.hasMany(Attendance, { foreignKey: 'user_id', as: 'attendances' });
Attendance.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> LeaveRequest (1:Many)
User.hasMany(LeaveRequest, { foreignKey: 'user_id', as: 'leaveRequests' });
LeaveRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
LeaveRequest.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

// User <-> Payroll (1:Many)
User.hasMany(Payroll, { foreignKey: 'user_id', as: 'payrolls' });
Payroll.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = { User, Employee, Attendance, LeaveRequest, Payroll };
