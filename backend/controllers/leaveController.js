const { Op } = require('sequelize');
const { notifyLeaveNew, notifyLeaveStatus } = require('./notificationController');
const { sequelize } = require('../config/database');
const { LeaveRequest, LeaveQuota, User, Employee } = require('../models');
const { validationResult } = require('express-validator');

// ── Constants ─────────────────────────────────────────────────
const ANNUAL_QUOTA = 12; // Jatah cuti tahunan default

const LEAVE_TYPE_LABELS = {
  annual:    'Cuti Tahunan',
  sick:      'Cuti Sakit',
  emergency: 'Cuti Darurat',
  maternity: 'Cuti Melahirkan',
  paternity: 'Cuti Ayah',
  unpaid:    'Cuti Tanpa Bayaran',
  other:     'Lainnya',
};

// ── Helpers ───────────────────────────────────────────────────
const calcWorkingDays = (startDate, endDate) => {
  let count = 0;
  const cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++; // exclude Sunday (0) & Saturday (6)
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

const ensureQuota = async (userId, year) => {
  const [quota] = await LeaveQuota.findOrCreate({
    where: { user_id: userId, year },
    defaults: {
      user_id: userId,
      year,
      annual_quota: ANNUAL_QUOTA,
      annual_used: 0,
      sick_used: 0,
      carry_over: 0,
    },
  });
  return quota;
};

// ─────────────────────────────────────────────────────────────
// POST /api/leaves  — Ajukan cuti
// ─────────────────────────────────────────────────────────────
const create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await t.rollback();
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.user.id;
    const { type, start_date, end_date, reason } = req.body;

    // Validate dates
    const start = new Date(start_date);
    const end   = new Date(end_date);
    if (start > end) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Tanggal mulai harus sebelum tanggal selesai' });
    }

    // No past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Tidak bisa mengajukan cuti untuk tanggal yang sudah lewat' });
    }

    const totalDays = calcWorkingDays(start_date, end_date);
    if (totalDays === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Rentang tanggal tidak mencakup hari kerja (Senin–Jumat)' });
    }

    // Check overlap with existing approved/pending leaves
    const overlap = await LeaveRequest.findOne({
      where: {
        user_id: userId,
        status: { [Op.in]: ['pending', 'approved'] },
        [Op.or]: [
          { start_date: { [Op.between]: [start_date, end_date] } },
          { end_date:   { [Op.between]: [start_date, end_date] } },
          {
            start_date: { [Op.lte]: start_date },
            end_date:   { [Op.gte]: end_date },
          },
        ],
      },
    });

    if (overlap) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        message: `Terdapat cuti yang sudah ada (${overlap.start_date} s/d ${overlap.end_date}) yang bertabrakan`,
        code: 'LEAVE_OVERLAP',
      });
    }

    // Check annual quota for 'annual' type
    if (type === 'annual') {
      const year  = start.getFullYear();
      const quota = await ensureQuota(userId, year);
      const remaining = quota.annual_quota + quota.carry_over - quota.annual_used;
      if (totalDays > remaining) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Kuota cuti tahunan tidak cukup. Sisa: ${remaining} hari, dibutuhkan: ${totalDays} hari`,
          code: 'QUOTA_EXCEEDED',
          data: { remaining, requested: totalDays },
        });
      }
    }

    const leave = await LeaveRequest.create({
      user_id: userId,
      type,
      start_date,
      end_date,
      total_days: totalDays,
      reason,
      status: 'pending',
    }, { transaction: t });

    await t.commit();

    // Fetch with user info
    const full = await LeaveRequest.findByPk(leave.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
    });

    return res.status(201).json({
      success: true,
      message: `Pengajuan cuti ${LEAVE_TYPE_LABELS[type]} (${totalDays} hari kerja) berhasil dikirim`,
      data: { leave: full },
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/leaves  — Daftar cuti milik user
// ─────────────────────────────────────────────────────────────
const getMyLeaves = async (req, res, next) => {
  try {
    const { status, year, page = 1, limit = 20 } = req.query;
    const where = { user_id: req.user.id };

    if (status) where.status = status;
    if (year) {
      where.start_date = {
        [Op.between]: [`${year}-01-01`, `${year}-12-31`],
      };
    }

    const { count, rows } = await LeaveRequest.findAndCountAll({
      where,
      include: [
        { model: User, as: 'approver', attributes: ['id', 'name'], required: false },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return res.json({
      success: true,
      data: {
        leaves: rows,
        pagination: {
          total: count,
          page:  parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// GET /api/leaves/quota  — Sisa kuota cuti user
// ─────────────────────────────────────────────────────────────
const getMyQuota = async (req, res, next) => {
  try {
    const year  = parseInt(req.query.year) || new Date().getFullYear();
    const quota = await ensureQuota(req.user.id, year);
    const annualRemaining = quota.annual_quota + quota.carry_over - quota.annual_used;

    return res.json({
      success: true,
      data: {
        year,
        annual_quota:     quota.annual_quota,
        carry_over:       quota.carry_over,
        annual_used:      quota.annual_used,
        annual_remaining: Math.max(0, annualRemaining),
        sick_used:        quota.sick_used,
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// GET /api/leaves/:id  — Detail satu cuti
// ─────────────────────────────────────────────────────────────
const getOne = async (req, res, next) => {
  try {
    const leave = await LeaveRequest.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user',     attributes: ['id', 'name', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'name'], required: false },
      ],
    });

    if (!leave) return res.status(404).json({ success: false, message: 'Data cuti tidak ditemukan' });

    // Employee can only view their own
    if (req.user.role === 'employee' && leave.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    return res.json({ success: true, data: { leave } });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/leaves/:id  — Batalkan cuti (hanya pending)
// ─────────────────────────────────────────────────────────────
const cancel = async (req, res, next) => {
  try {
    const leave = await LeaveRequest.findByPk(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    if (leave.user_id !== req.user.id) return res.status(403).json({ success: false, message: 'Akses ditolak' });
    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Tidak bisa membatalkan cuti dengan status "${leave.status}"`,
      });
    }

    await leave.update({ status: 'cancelled' });
    return res.json({ success: true, message: 'Pengajuan cuti berhasil dibatalkan' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// GET /api/leaves/admin/pending  — Admin/HR: semua pending
// ─────────────────────────────────────────────────────────────
const getPending = async (req, res, next) => {
  try {
    const { department } = req.query;

    const leaves = await LeaveRequest.findAll({
      where: { status: 'pending' },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
          include: [{
            model: Employee,
            as: 'employee',
            attributes: ['nip', 'department', 'position'],
            where: department ? { department } : {},
            required: !!department,
          }],
        },
      ],
      order: [['created_at', 'ASC']],
    });

    return res.json({ success: true, data: { leaves, total: leaves.length } });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// GET /api/leaves/admin/all  — Admin/HR: semua cuti + filter
// ─────────────────────────────────────────────────────────────
const getAll = async (req, res, next) => {
  try {
    const { status, month, userId, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status)  where.status  = status;
    if (userId)  where.user_id = userId;
    if (month) {
      const [y, m] = month.split('-');
      where.start_date = { [Op.between]: [`${y}-${m}-01`, new Date(y, m, 0).toISOString().split('T')[0]] };
    }

    const { count, rows } = await LeaveRequest.findAndCountAll({
      where,
      include: [
        {
          model: User, as: 'user', attributes: ['id', 'name', 'email'],
          include: [{ model: Employee, as: 'employee', attributes: ['department', 'position', 'nip'], required: false }],
        },
        { model: User, as: 'approver', attributes: ['id', 'name'], required: false },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return res.json({
      success: true,
      data: {
        leaves: rows,
        pagination: { total: count, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) },
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/leaves/:id/approve  — Setujui cuti
// ─────────────────────────────────────────────────────────────
const approve = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const leave = await LeaveRequest.findByPk(req.params.id, { transaction: t });
    if (!leave) { await t.rollback(); return res.status(404).json({ success: false, message: 'Data tidak ditemukan' }); }
    if (leave.status !== 'pending') {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Cuti sudah berstatus "${leave.status}"` });
    }

    // Update quota
    const year = new Date(leave.start_date).getFullYear();
    const quota = await ensureQuota(leave.user_id, year);

    if (leave.type === 'annual') {
      const remaining = quota.annual_quota + quota.carry_over - quota.annual_used;
      if (leave.total_days > remaining) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Kuota cuti tahunan tidak cukup untuk disetujui. Sisa: ${remaining} hari`,
        });
      }
      await quota.update({ annual_used: quota.annual_used + leave.total_days }, { transaction: t });
    } else if (leave.type === 'sick') {
      await quota.update({ sick_used: quota.sick_used + leave.total_days }, { transaction: t });
    }

    await leave.update({
      status: 'approved',
      approved_by: req.user.id,
      approved_at: new Date(),
    }, { transaction: t });

    await t.commit();

    return res.json({
      success: true,
      message: `Cuti ${LEAVE_TYPE_LABELS[leave.type]} (${leave.total_days} hari) berhasil disetujui`,
      data: { leave },
    });
  } catch (err) { await t.rollback(); next(err); }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/leaves/:id/reject  — Tolak cuti
// ─────────────────────────────────────────────────────────────
const reject = async (req, res, next) => {
  try {
    const { rejection_reason } = req.body;
    const leave = await LeaveRequest.findByPk(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cuti sudah berstatus "${leave.status}"` });
    }

    await leave.update({
      status: 'rejected',
      approved_by: req.user.id,
      rejection_reason: rejection_reason || 'Tidak disebutkan',
      approved_at: new Date(),
    });

    return res.json({
      success: true,
      message: 'Pengajuan cuti berhasil ditolak',
      data: { leave },
    });
  } catch (err) { next(err); }
};

module.exports = {
  create, getMyLeaves, getMyQuota, getOne, cancel,
  getPending, getAll, approve, reject,
};
