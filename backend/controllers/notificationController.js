const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { Notification, User, Employee, LeaveRequest, PayrollRun, LoanManagement } = require('../models');

// ── Helper: create notification ──────────────────────────────
const createNotif = async (userId, type, title, message, opts = {}) => {
  try {
    return await Notification.create({
      user_id:    userId,
      type,
      title,
      message,
      link:       opts.link       || null,
      created_by: opts.createdBy  || null,
      metadata:   opts.metadata   || null,
      is_read:    false,
    });
  } catch (e) {
    console.error('createNotif error:', e.message);
    return null;
  }
};

// ── GET /api/notifications ────────────────────────────────────
const getMyNotifs = async (req, res, next) => {
  try {
    const { limit = 20, unread_only } = req.query;
    const where = { user_id: req.user.id };
    if (unread_only === 'true') where.is_read = false;

    const notifs = await Notification.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
    });

    const unreadCount = await Notification.count({
      where: { user_id: req.user.id, is_read: false },
    });

    return res.json({ success: true, data: { notifications: notifs, unread_count: unreadCount } });
  } catch (err) { next(err); }
};

// ── PATCH /api/notifications/:id/read ────────────────────────
const markRead = async (req, res, next) => {
  try {
    await Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { id: req.params.id, user_id: req.user.id } }
    );
    return res.json({ success: true });
  } catch (err) { next(err); }
};

// ── PATCH /api/notifications/read-all ────────────────────────
const markAllRead = async (req, res, next) => {
  try {
    await Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { user_id: req.user.id, is_read: false } }
    );
    return res.json({ success: true, message: 'Semua notifikasi ditandai sudah dibaca' });
  } catch (err) { next(err); }
};

// ── DELETE /api/notifications/:id ────────────────────────────
const deleteNotif = async (req, res, next) => {
  try {
    await Notification.destroy({ where: { id: req.params.id, user_id: req.user.id } });
    return res.json({ success: true });
  } catch (err) { next(err); }
};

// ── DELETE /api/notifications/clear-all ──────────────────────
const clearAll = async (req, res, next) => {
  try {
    await Notification.destroy({ where: { user_id: req.user.id, is_read: true } });
    return res.json({ success: true, message: 'Notifikasi yang sudah dibaca dihapus' });
  } catch (err) { next(err); }
};

// ── POST /api/notifications/announce ─────────────────────────
// HR/Admin kirim pengumuman ke semua/departemen tertentu
const announce = async (req, res, next) => {
  try {
    if (!['admin','hr'].includes(req.user.role))
      return res.status(403).json({ success: false, message: 'Akses ditolak' });

    const { title, message, department, link } = req.body;
    if (!title || !message)
      return res.status(400).json({ success: false, message: 'title dan message wajib' });

    // Get target users
    const include = [{ model: Employee, as: 'employee', required: true }];
    const empWhere = { status: 'active' };
    if (department) empWhere.department = department;

    const users = await User.findAll({
      where: { is_active: true },
      include: [{ model: Employee, as: 'employee', where: empWhere, required: true }],
    });

    await Promise.all(users.map(u => createNotif(u.id, 'announcement', title, message, {
      link, createdBy: req.user.id,
    })));

    return res.json({ success: true, message: `Pengumuman dikirim ke ${users.length} karyawan` });
  } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════
// TRIGGER FUNCTIONS — dipanggil dari controller lain
// ════════════════════════════════════════════════════════════════

// Payroll run approved — notif ke semua karyawan dalam run
const notifyPayrollReady = async (runId) => {
  try {
    const { PayrollItem } = require('../models');
    const run   = await PayrollRun.findByPk(runId);
    const items = await PayrollItem.findAll({ where: { payroll_run_id: runId } });
    for (const item of items) {
      await createNotif(
        item.user_id,
        'payroll_ready',
        `Slip Gaji ${run.period_label} Tersedia`,
        `Slip gaji Anda untuk periode ${run.period_label} sudah bisa dilihat.`,
        { link: '/payroll-pro', metadata: { run_id: runId, item_id: item.id } }
      );
    }
    console.log(`Notif payroll_ready dikirim ke ${items.length} karyawan`);
  } catch (e) { console.error('notifyPayrollReady:', e.message); }
};

// Gaji ditransfer via Flip
const notifyPayrollPaid = async (itemId) => {
  try {
    const { PayrollItem } = require('../models');
    const item = await PayrollItem.findByPk(itemId, {
      include: [{ model: PayrollRun, as: 'run' }]
    });
    if (!item) return;
    await createNotif(
      item.user_id,
      'payroll_paid',
      `Gaji ${item.run?.period_label} Sudah Ditransfer 💰`,
      `Gaji Anda sebesar Rp ${Number(item.net_salary).toLocaleString('id-ID')} sudah ditransfer ke rekening Anda.`,
      { link: '/payroll-pro', metadata: { run_id: item.payroll_run_id, item_id: itemId } }
    );
  } catch (e) { console.error('notifyPayrollPaid:', e.message); }
};

// Cuti baru diajukan — notif ke HR/supervisor
const notifyLeaveNew = async (leaveId) => {
  try {
    const leave   = await LeaveRequest.findByPk(leaveId, {
      include: [{ model: User, as: 'user', include: [{ model: Employee, as: 'employee' }] }]
    });
    if (!leave) return;

    // Notify all HR and admin users
    const hrUsers = await User.findAll({
      where: { role: { [Op.in]: ['admin','hr'] }, is_active: true },
    });
    const empName = leave.user?.name || 'Karyawan';
    const dept    = leave.user?.employee?.department || '';

    for (const hr of hrUsers) {
      await createNotif(
        hr.id,
        'leave_pending',
        `Pengajuan Cuti Baru`,
        `${empName} ${dept ? `(${dept})` : ''} mengajukan cuti ${leave.leave_type} selama ${leave.days} hari (${leave.start_date} s/d ${leave.end_date}).`,
        { link: '/leaves', metadata: { leave_id: leaveId } }
      );
    }
  } catch (e) { console.error('notifyLeaveNew:', e.message); }
};

// Cuti disetujui/ditolak — notif ke karyawan
const notifyLeaveStatus = async (leaveId, status, approverNote) => {
  try {
    const leave = await LeaveRequest.findByPk(leaveId);
    if (!leave) return;

    const type    = status === 'approved' ? 'leave_approved' : 'leave_rejected';
    const emoji   = status === 'approved' ? '✅' : '❌';
    const action  = status === 'approved' ? 'disetujui' : 'ditolak';

    await createNotif(
      leave.user_id,
      type,
      `Cuti ${action.charAt(0).toUpperCase() + action.slice(1)} ${emoji}`,
      `Pengajuan cuti ${leave.leave_type} Anda (${leave.start_date} s/d ${leave.end_date}) telah ${action}.${approverNote ? ' Catatan: ' + approverNote : ''}`,
      { link: '/leaves', metadata: { leave_id: leaveId } }
    );
  } catch (e) { console.error('notifyLeaveStatus:', e.message); }
};

// Kasbon disetujui — notif ke karyawan
const notifyLoanApproved = async (loanId) => {
  try {
    const loan = await LoanManagement.findByPk(loanId);
    if (!loan) return;
    await createNotif(
      loan.user_id,
      'loan_approved',
      `${loan.type === 'kasbon' ? 'Kasbon' : 'Pinjaman'} Disetujui ✅`,
      `${loan.type === 'kasbon' ? 'Kasbon' : 'Pinjaman'} Anda sebesar Rp ${Number(loan.total_amount).toLocaleString('id-ID')} telah disetujui dengan cicilan Rp ${Number(loan.monthly_installment).toLocaleString('id-ID')}/bulan.`,
      { link: '/payroll-pro', metadata: { loan_id: loanId } }
    );
  } catch (e) { console.error('notifyLoanApproved:', e.message); }
};

// ── GET /api/notifications/count ─────────────────────────────
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.count({
      where: { user_id: req.user.id, is_read: false },
    });
    return res.json({ success: true, data: { count } });
  } catch (err) { next(err); }
};

// ── POST /api/notifications/check-triggers ────────────────────
// Cron-like: dipanggil frontend setiap 30 menit atau manual HR
const checkTriggers = async (req, res, next) => {
  try {
    if (!['admin','hr'].includes(req.user.role))
      return res.status(403).json({ success: false, message: 'Akses ditolak' });

    let triggered = 0;

    // 1. Birthday check
    const today  = new Date();
    const mmdd   = `${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const employees = await User.findAll({
      where: { is_active: true },
      include: [{ model: Employee, as: 'employee', required: true }],
    });

    for (const u of employees) {
      const bday = u.employee?.birth_date;
      if (!bday) continue;
      const bdayMmdd = bday.slice(5,10);
      if (bdayMmdd === mmdd) {
        // Check if birthday notif already sent today
        const existing = await Notification.findOne({
          where: {
            user_id: u.id, type: 'birthday',
            created_at: { [Op.gte]: new Date(today.setHours(0,0,0,0)) }
          }
        });
        if (!existing) {
          await createNotif(u.id, 'birthday', '🎂 Selamat Ulang Tahun!',
            `Selamat ulang tahun! Semoga selalu sehat, sukses, dan bahagia.`,
            { link: '/dashboard' }
          );
          triggered++;
        }
      }
    }

    // 2. Leave quota reminder (< 3 days remaining)
    const { LeaveQuota } = require('../models');
    const quotas = await LeaveQuota.findAll({
      where: { year: today.getFullYear() },
    });
    for (const q of quotas) {
      const remaining = Math.max(0, (q.annual_quota || 0) + (q.carry_over || 0) - (q.annual_used || 0));
      if (remaining <= 3 && remaining > 0) {
        const existing = await Notification.findOne({
          where: {
            user_id: q.user_id, type: 'leave_reminder',
            created_at: { [Op.gte]: new Date(new Date().setDate(new Date().getDate()-7)) }
          }
        });
        if (!existing) {
          await createNotif(q.user_id, 'leave_reminder', '⏰ Sisa Cuti Hampir Habis',
            `Sisa cuti tahunan Anda tinggal ${remaining} hari. Segera ajukan sebelum akhir tahun.`,
            { link: '/leaves' }
          );
          triggered++;
        }
      }
    }

    return res.json({ success: true, message: `${triggered} notifikasi otomatis dikirim`, data: { triggered } });
  } catch (err) { next(err); }
};

module.exports = {
  getMyNotifs, getUnreadCount, markRead, markAllRead, deleteNotif, clearAll,
  announce, checkTriggers,
  // Trigger functions for other controllers
  notifyPayrollReady, notifyPayrollPaid,
  notifyLeaveNew, notifyLeaveStatus,
  notifyLoanApproved,
  createNotif,
};
