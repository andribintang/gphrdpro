const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { Attendance, User, Employee } = require('../models');

// ─── Constants ────────────────────────────────────────────────
const WORK_START_HOUR   = 8;
const WORK_START_MINUTE = 0;
const LATE_GRACE_MINUTE = 5;  // toleransi 5 menit → terlambat jika >08:05
const WORK_END_HOUR     = 17;
const WORK_END_MINUTE   = 0;

// ─── Helpers ──────────────────────────────────────────────────
const getWIBNow = () => {
  // Convert to WIB (UTC+7)
  const now = new Date();
  const wib = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  return wib;
};

const getTodayWIB = () => {
  const wib = getWIBNow();
  return wib.toISOString().split('T')[0]; // YYYY-MM-DD
};

const getTimeString = (date) => {
  // HH:MM:SS in WIB
  const wib = new Date(date.getTime() + (7 * 60 * 60 * 1000));
  return wib.toISOString().split('T')[1].split('.')[0];
};

const determineStatus = (checkInTime) => {
  // checkInTime is HH:MM:SS string
  const [h, m] = checkInTime.split(':').map(Number);
  const lateThresholdMinutes = WORK_START_HOUR * 60 + WORK_START_MINUTE + LATE_GRACE_MINUTE;
  const checkInMinutes = h * 60 + m;
  return checkInMinutes > lateThresholdMinutes ? 'late' : 'present';
};

const calcWorkHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;
  const [ih, im, is_] = checkIn.split(':').map(Number);
  const [oh, om, os]  = checkOut.split(':').map(Number);
  const inMins  = ih * 60 + im + (is_ || 0) / 60;
  const outMins = oh * 60 + om + (os  || 0) / 60;
  return Math.max(0, Math.round((outMins - inMins) * 100) / 100);
};

// ─────────────────────────────────────────────────────────────
// POST /api/attendance/check-in
// ─────────────────────────────────────────────────────────────
const checkIn = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today  = getTodayWIB();
    const now    = getWIBNow();

    // 1. Cek sudah check-in hari ini?
    const existing = await Attendance.findOne({
      where: { user_id: userId, date: today },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: existing.check_out
          ? 'Anda sudah check-in dan check-out hari ini'
          : 'Anda sudah check-in hari ini',
        code: 'ALREADY_CHECKED_IN',
        data: { attendance: existing },
      });
    }

    // 2. Ambil GPS dari body (atau null jika tidak ada)
    const { lat, lng, notes } = req.body;
    const checkInTime = getTimeString(now);
    const status = determineStatus(checkInTime);

    // 3. Buat record attendance
    const attendance = await Attendance.create({
      user_id: userId,
      date:    today,
      check_in:     checkInTime,
      check_in_lat: lat  ? parseFloat(lat)  : null,
      check_in_lng: lng  ? parseFloat(lng)  : null,
      status,
      notes: notes || null,
    });

    return res.status(201).json({
      success: true,
      message: status === 'late'
        ? `Check-in berhasil. Anda terlambat ${checkInTime.slice(0, 5)} (batas 08:05)`
        : `Check-in berhasil! Tepat waktu pukul ${checkInTime.slice(0, 5)}`,
      data: { attendance },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/attendance/check-out
// ─────────────────────────────────────────────────────────────
const checkOut = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today  = getTodayWIB();
    const now    = getWIBNow();

    // 1. Harus sudah check-in
    const attendance = await Attendance.findOne({
      where: { user_id: userId, date: today },
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'Anda belum check-in hari ini',
        code: 'NOT_CHECKED_IN',
      });
    }

    if (attendance.check_out) {
      return res.status(409).json({
        success: false,
        message: `Anda sudah check-out pukul ${attendance.check_out.slice(0, 5)}`,
        code: 'ALREADY_CHECKED_OUT',
        data: { attendance },
      });
    }

    const { lat, lng, notes } = req.body;
    const checkOutTime = getTimeString(now);
    const workHours = calcWorkHours(attendance.check_in, checkOutTime);

    await attendance.update({
      check_out:     checkOutTime,
      check_out_lat: lat ? parseFloat(lat) : null,
      check_out_lng: lng ? parseFloat(lng) : null,
      work_hours: workHours,
      notes: notes || attendance.notes,
    });

    return res.json({
      success: true,
      message: `Check-out berhasil pukul ${checkOutTime.slice(0, 5)}. Total kerja: ${workHours} jam`,
      data: { attendance },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/attendance/today
// ─────────────────────────────────────────────────────────────
const getToday = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today  = getTodayWIB();
    const nowWIB = getWIBNow();

    const attendance = await Attendance.findOne({
      where: { user_id: userId, date: today },
    });

    // Kirim info waktu server WIB juga agar frontend sync
    return res.json({
      success: true,
      data: {
        attendance,   // null jika belum check-in
        today,
        server_time: getTimeString(nowWIB),
        server_datetime: nowWIB.toISOString(),
        is_work_hours: (() => {
          const h = nowWIB.getUTCHours();
          const m = nowWIB.getUTCMinutes();
          const mins = h * 60 + m;
          return mins >= WORK_START_HOUR * 60 && mins <= (WORK_END_HOUR * 60 + WORK_END_MINUTE);
        })(),
        late_threshold: `${String(WORK_START_HOUR).padStart(2,'0')}:${String(WORK_START_MINUTE + LATE_GRACE_MINUTE).padStart(2,'0')}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/attendance/history?month=2024-01&page=1&limit=20
// ─────────────────────────────────────────────────────────────
const getHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { month, page = 1, limit = 30 } = req.query;

    let whereClause = { user_id: userId };

    if (month) {
      // Filter by month YYYY-MM
      const [y, m] = month.split('-');
      const startDate = `${y}-${m}-01`;
      const endDate   = new Date(y, m, 0).toISOString().split('T')[0]; // last day
      whereClause.date = { [Op.between]: [startDate, endDate] };
    } else {
      // Default: 30 hari terakhir
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      whereClause.date = { [Op.gte]: thirtyDaysAgo.toISOString().split('T')[0] };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Attendance.findAndCountAll({
      where: whereClause,
      order: [['date', 'DESC']],
      limit:  parseInt(limit),
      offset,
    });

    // Summary stats
    const allRecords = await Attendance.findAll({ where: whereClause });
    const stats = {
      total_days:   allRecords.length,
      present:      allRecords.filter(r => r.status === 'present').length,
      late:         allRecords.filter(r => r.status === 'late').length,
      absent:       allRecords.filter(r => r.status === 'absent').length,
      total_hours:  allRecords.reduce((sum, r) => sum + (parseFloat(r.work_hours) || 0), 0).toFixed(1),
    };

    return res.json({
      success: true,
      data: {
        records: rows,
        stats,
        pagination: {
          total: count,
          page:  parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/attendance/admin/all?date=2024-01-15&department=IT
// Admin/HR: lihat semua absensi hari tertentu
// ─────────────────────────────────────────────────────────────
const getAdminDaily = async (req, res, next) => {
  try {
    const { date, department } = req.query;
    const targetDate = date || getTodayWIB();

    // Ambil semua users + employee info
    const users = await User.findAll({
      where: { is_active: true, role: ['employee', 'supervisor', 'hr'] },
      include: [{
        model: Employee,
        as: 'employee',
        where: department ? { department } : {},
        required: false,
      }],
    });

    // Ambil attendance hari itu
    const attendances = await Attendance.findAll({
      where: { date: targetDate },
    });

    const attMap = {};
    attendances.forEach(a => { attMap[a.user_id] = a; });

    const report = users.map(u => ({
      user_id:    u.id,
      name:       u.name,
      nip:        u.employee?.nip,
      department: u.employee?.department,
      position:   u.employee?.position,
      attendance: attMap[u.id] || null,
      status:     attMap[u.id]?.status || 'absent',
    }));

    const summary = {
      date: targetDate,
      total:   report.length,
      present: report.filter(r => r.status === 'present').length,
      late:    report.filter(r => r.status === 'late').length,
      absent:  report.filter(r => r.status === 'absent').length,
    };

    return res.json({
      success: true,
      data: { summary, report },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/attendance/admin/monthly?userId=5&month=2024-01
// ─────────────────────────────────────────────────────────────
const getAdminMonthly = async (req, res, next) => {
  try {
    const { userId, month } = req.query;
    if (!userId || !month) {
      return res.status(400).json({ success: false, message: 'userId dan month diperlukan' });
    }

    const [y, m] = month.split('-');
    const startDate = `${y}-${m}-01`;
    const endDate   = new Date(y, m, 0).toISOString().split('T')[0];

    const records = await Attendance.findAll({
      where: {
        user_id: userId,
        date: { [Op.between]: [startDate, endDate] },
      },
      order: [['date', 'ASC']],
    });

    const user = await User.findByPk(userId, {
      include: [{ model: Employee, as: 'employee' }],
    });

    return res.json({
      success: true,
      data: {
        user,
        month,
        records,
        stats: {
          present:     records.filter(r => r.status === 'present').length,
          late:        records.filter(r => r.status === 'late').length,
          total_hours: records.reduce((s, r) => s + (parseFloat(r.work_hours) || 0), 0).toFixed(1),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { checkIn, checkOut, getToday, getHistory, getAdminDaily, getAdminMonthly };
