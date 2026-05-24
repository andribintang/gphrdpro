const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { Attendance, User, Employee, OfficeSetting, EmployeeFace } = require('../models');
const https = require('https');

const LATE_GRACE = 5;
const DEFAULT_RADIUS = 100;

const getWIBNow = () => new Date(Date.now() + 7 * 3600000);
const getTodayWIB = () => getWIBNow().toISOString().split('T')[0];
const getTimeString = (d) => new Date(d.getTime() + 7 * 3600000).toISOString().split('T')[1].split('.')[0];

const determineStatus = (timeStr, deadline = '08:05') => {
  const [h, m] = timeStr.split(':').map(Number);
  const [dh, dm] = deadline.split(':').map(Number);
  return (h * 60 + m) > (dh * 60 + dm) ? 'late' : 'present';
};

const calcDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const calcWorkHours = (checkIn, checkOut, breakMins = 0) => {
  if (!checkIn || !checkOut) return null;
  const [ih, im] = checkIn.split(':').map(Number);
  const [oh, om] = checkOut.split(':').map(Number);
  const mins = (oh * 60 + om) - (ih * 60 + im) - breakMins;
  return Math.max(0, Math.round((mins / 60) * 100) / 100);
};

const uploadToCloudinary = async (base64Image, folder = 'attendance') => {
  return new Promise((resolve) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const preset = process.env.CLOUDINARY_UPLOAD_PRESET || 'hrd_attendance';
    if (!cloudName || !base64Image) { resolve(null); return; }

    const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const body = JSON.stringify({
      file: `data:image/jpeg;base64,${imageData}`,
      upload_preset: preset,
      folder,
      transformation: 'w_400,h_400,c_fill,g_face',
    });

    const req = https.request({
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${cloudName}/image/upload`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        try { resolve(JSON.parse(data).secure_url || null); } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
    req.write(body); req.end();
  });
};

const getOfficeCfg = async () => {
  const office = await OfficeSetting.findOne({ where: { is_active: true } });
  return office || { lat: null, lng: null, radius: DEFAULT_RADIUS, check_in_deadline: '08:05', name: 'Kantor' };
};

// ── CHECK IN ──────────────────────────────────────────────────
const checkIn = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = getTodayWIB(), now = getWIBNow();

    const existing = await Attendance.findOne({ where: { user_id: userId, date: today } });
    if (existing) return res.status(409).json({ success: false, message: 'Sudah check-in hari ini', code: 'ALREADY_CHECKED_IN', data: { attendance: existing } });

    const { lat, lng, selfie_base64, face_score, face_verified = false } = req.body;
    const office = await getOfficeCfg();

    let locationVerified = false, distanceFromOffice = null;
    if (lat && lng && office.lat && office.lng) {
      distanceFromOffice = calcDistance(parseFloat(lat), parseFloat(lng), parseFloat(office.lat), parseFloat(office.lng));
      locationVerified = distanceFromOffice <= parseInt(office.radius || DEFAULT_RADIUS);
    }

    const selfieUrl = selfie_base64 ? await uploadToCloudinary(selfie_base64, 'attendance/check-in') : null;
    const checkInTime = getTimeString(now);
    const status = determineStatus(checkInTime, office.check_in_deadline || '08:05');

    const attendance = await Attendance.create({
      user_id: userId, date: today,
      check_in: checkInTime,
      check_in_lat: lat ? parseFloat(lat) : null,
      check_in_lng: lng ? parseFloat(lng) : null,
      check_in_selfie_url: selfieUrl,
      check_in_face_score: face_score ? parseFloat(face_score) : null,
      check_in_face_verified: Boolean(face_verified),
      check_in_distance: distanceFromOffice,
      check_in_location_verified: locationVerified,
      status,
      device_info: { userAgent: req.headers['user-agent'], ip: req.ip },
      ip_address: req.ip || null,
    });

    const late = status === 'late';
    const outside = !locationVerified && distanceFromOffice !== null;
    let message = `Check-in berhasil ${late ? '⚠️ Terlambat' : '✅ Tepat waktu'} pukul ${checkInTime.slice(0,5)}`;
    if (outside) message += ` · Di luar area kantor (${distanceFromOffice}m)`;

    return res.status(201).json({ success: true, message, data: { attendance, validation: { face_verified: Boolean(face_verified), face_score: face_score || null, location_verified: locationVerified, distance_meters: distanceFromOffice, office_radius: office.radius } } });
  } catch (err) { next(err); }
};

// ── CHECK OUT ─────────────────────────────────────────────────
const checkOut = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = getTodayWIB(), now = getWIBNow();

    const attendance = await Attendance.findOne({ where: { user_id: userId, date: today } });
    if (!attendance?.check_in) return res.status(400).json({ success: false, message: 'Belum check-in hari ini', code: 'NOT_CHECKED_IN' });
    if (attendance.check_out) return res.status(409).json({ success: false, message: `Sudah check-out pukul ${attendance.check_out.slice(0,5)}`, code: 'ALREADY_CHECKED_OUT' });

    let breakMins = attendance.total_break_minutes || 0;
    if (attendance.break_start && !attendance.break_end) {
      const [bh, bm] = attendance.break_start.split(':').map(Number);
      const wib = getWIBNow();
      const cur = wib.getUTCHours() * 60 + wib.getUTCMinutes();
      breakMins += Math.max(0, cur - (bh * 60 + bm));
    }

    const { lat, lng, selfie_base64, face_verified = false } = req.body;
    const checkOutTime = getTimeString(now);
    const selfieUrl = selfie_base64 ? await uploadToCloudinary(selfie_base64, 'attendance/check-out') : null;
    const workHours = calcWorkHours(attendance.check_in, checkOutTime, breakMins);

    await attendance.update({
      check_out: checkOutTime,
      check_out_lat: lat ? parseFloat(lat) : null,
      check_out_lng: lng ? parseFloat(lng) : null,
      check_out_selfie_url: selfieUrl,
      check_out_face_verified: Boolean(face_verified),
      total_break_minutes: breakMins,
      work_hours: workHours,
      break_end: attendance.break_start && !attendance.break_end ? checkOutTime : attendance.break_end,
    });

    return res.json({ success: true, message: `Check-out berhasil pukul ${checkOutTime.slice(0,5)}. Total kerja: ${workHours} jam`, data: { attendance } });
  } catch (err) { next(err); }
};

// ── BREAK START ───────────────────────────────────────────────
const breakStart = async (req, res, next) => {
  try {
    const attendance = await Attendance.findOne({ where: { user_id: req.user.id, date: getTodayWIB() } });
    if (!attendance?.check_in) return res.status(400).json({ success: false, message: 'Belum check-in' });
    if (attendance.check_out) return res.status(400).json({ success: false, message: 'Sudah check-out' });
    if (attendance.break_start && !attendance.break_end) return res.status(409).json({ success: false, message: 'Sedang istirahat', code: 'ALREADY_ON_BREAK' });

    const t = getTimeString(getWIBNow());
    await attendance.update({ break_start: t, break_end: null });
    return res.json({ success: true, message: `Istirahat dimulai pukul ${t.slice(0,5)}`, data: { attendance } });
  } catch (err) { next(err); }
};

// ── BREAK END / RESUME ────────────────────────────────────────
const breakEnd = async (req, res, next) => {
  try {
    const attendance = await Attendance.findOne({ where: { user_id: req.user.id, date: getTodayWIB() } });
    if (!attendance?.break_start) return res.status(400).json({ success: false, message: 'Belum mulai istirahat' });
    if (attendance.break_end) return res.status(409).json({ success: false, message: 'Istirahat sudah selesai' });

    const t = getTimeString(getWIBNow());
    const [bh, bm] = attendance.break_start.split(':').map(Number);
    const [rh, rm] = t.split(':').map(Number);
    const mins = Math.max(0, (rh * 60 + rm) - (bh * 60 + bm));
    const total = (attendance.total_break_minutes || 0) + mins;

    await attendance.update({ break_end: t, total_break_minutes: total });
    return res.json({ success: true, message: `Kembali kerja pukul ${t.slice(0,5)}. Istirahat: ${mins} menit`, data: { attendance } });
  } catch (err) { next(err); }
};

// ── GET TODAY ─────────────────────────────────────────────────
const getToday = async (req, res, next) => {
  try {
    const today = getTodayWIB(), nowWIB = getWIBNow();
    const [attendance, office] = await Promise.all([
      Attendance.findOne({ where: { user_id: req.user.id, date: today } }),
      getOfficeCfg(),
    ]);
    return res.json({ success: true, data: { attendance, today, server_time: getTimeString(nowWIB), server_datetime: nowWIB.toISOString(), office: { lat: office.lat, lng: office.lng, radius: office.radius, name: office.name, check_in_deadline: office.check_in_deadline || '08:05' }, late_threshold: office.check_in_deadline || '08:05' } });
  } catch (err) { next(err); }
};

// ── HISTORY ───────────────────────────────────────────────────
const getHistory = async (req, res, next) => {
  try {
    const { month, page = 1, limit = 30 } = req.query;
    let where = { user_id: req.user.id };
    if (month) {
      const [y, m] = month.split('-');
      where.date = { [Op.between]: [`${y}-${m}-01`, new Date(y, m, 0).toISOString().split('T')[0]] };
    } else {
      const d = new Date(); d.setDate(d.getDate() - 30);
      where.date = { [Op.gte]: d.toISOString().split('T')[0] };
    }
    const { count, rows } = await Attendance.findAndCountAll({ where, order: [['date', 'DESC']], limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit) });
    const all = await Attendance.findAll({ where });
    const stats = { total_days: all.length, present: all.filter(r=>r.status==='present').length, late: all.filter(r=>r.status==='late').length, absent: all.filter(r=>r.status==='absent').length, total_hours: all.reduce((s,r)=>s+(parseFloat(r.work_hours)||0),0).toFixed(1), face_verified: all.filter(r=>r.check_in_face_verified).length, location_verified: all.filter(r=>r.check_in_location_verified).length };
    return res.json({ success: true, data: { records: rows, stats, pagination: { total: count, page: parseInt(page), totalPages: Math.ceil(count/parseInt(limit)) } } });
  } catch (err) { next(err); }
};

// ── REALTIME MONITORING ───────────────────────────────────────
const getRealtimeMonitoring = async (req, res, next) => {
  try {
    const today = getTodayWIB();
    const [users, attendances, office] = await Promise.all([
      User.findAll({ where: { is_active: true, role: { [Op.in]: ['employee','hr','supervisor'] } }, include: [{ model: Employee, as: 'employee', required: false }], attributes: { exclude: ['password_hash','refresh_token'] } }),
      Attendance.findAll({ where: { date: today }, order: [['check_in','DESC']] }),
      getOfficeCfg(),
    ]);
    const attMap = {};
    attendances.forEach(a => { attMap[a.user_id] = a; });
    const report = users.map(u => ({ user_id: u.id, name: u.name, nip: u.employee?.nip, department: u.employee?.department, position: u.employee?.position, attendance: attMap[u.id] || null, status: attMap[u.id]?.status || 'absent', is_on_break: !!(attMap[u.id]?.break_start && !attMap[u.id]?.break_end) }));
    const summary = { date: today, total: report.length, present: report.filter(r=>r.status==='present'||r.status==='late').length, late: report.filter(r=>r.status==='late').length, absent: report.filter(r=>r.status==='absent').length, on_break: report.filter(r=>r.is_on_break).length, checked_out: report.filter(r=>r.attendance?.check_out).length, office: { lat: office.lat, lng: office.lng, radius: office.radius } };
    return res.json({ success: true, data: { summary, report } });
  } catch (err) { next(err); }
};

// ── OFFICE SETTINGS ───────────────────────────────────────────
const getOfficeSettingsApi = async (req, res, next) => {
  try {
    const office = await OfficeSetting.findOne({ where: { is_active: true } });
    return res.json({ success: true, data: { office } });
  } catch (err) { next(err); }
};

const updateOfficeSettings = async (req, res, next) => {
  try {
    const { name, address, lat, lng, radius, check_in_deadline, check_out_start, work_hours_required } = req.body;
    let office = await OfficeSetting.findOne({ where: { is_active: true } });
    if (office) { await office.update({ name, address, lat, lng, radius, check_in_deadline, check_out_start, work_hours_required }); }
    else { office = await OfficeSetting.create({ name, address, lat, lng, radius, check_in_deadline, check_out_start, work_hours_required }); }
    return res.json({ success: true, message: 'Pengaturan kantor tersimpan', data: { office } });
  } catch (err) { next(err); }
};

// ── FACE REGISTRATION ─────────────────────────────────────────
const registerFace = async (req, res, next) => {
  try {
    const { user_id, face_descriptor, selfie_base64 } = req.body;
    if (!face_descriptor || !Array.isArray(face_descriptor) || face_descriptor.length !== 128) {
      return res.status(400).json({ success: false, message: 'Face descriptor harus array 128 float' });
    }
    const photoUrl = selfie_base64 ? await uploadToCloudinary(selfie_base64, 'faces') : null;
    const targetUserId = user_id || req.user.id;
    const [face, created] = await EmployeeFace.findOrCreate({
      where: { user_id: targetUserId },
      defaults: { user_id: targetUserId, face_descriptor, face_photo_url: photoUrl, registered_by: req.user.id },
    });
    if (!created) await face.update({ face_descriptor, face_photo_url: photoUrl || face.face_photo_url, registered_by: req.user.id });
    return res.json({ success: true, message: created ? 'Wajah berhasil didaftarkan' : 'Data wajah diperbarui', data: { face_id: face.id, user_id: targetUserId } });
  } catch (err) { next(err); }
};

const getFaceStatus = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user.id;
    const face = await EmployeeFace.findOne({ where: { user_id: userId, is_active: true }, attributes: ['id','face_photo_url','created_at','updated_at'] });
    return res.json({ success: true, data: { registered: !!face, face } });
  } catch (err) { next(err); }
};

const getAdminMonthly = async (req, res, next) => {
  try {
    const { userId, month } = req.query;
    if (!userId || !month) return res.status(400).json({ success: false, message: 'userId dan month diperlukan' });
    const [y, m] = month.split('-');
    const records = await Attendance.findAll({ where: { user_id: userId, date: { [Op.between]: [`${y}-${m}-01`, new Date(y, m, 0).toISOString().split('T')[0]] } }, order: [['date','ASC']] });
    const user = await User.findByPk(userId, { include: [{ model: Employee, as: 'employee' }] });
    return res.json({ success: true, data: { user, month, records, stats: { present: records.filter(r=>r.status==='present').length, late: records.filter(r=>r.status==='late').length, total_hours: records.reduce((s,r)=>s+(parseFloat(r.work_hours)||0),0).toFixed(1) } } });
  } catch (err) { next(err); }
};


// ── Get ALL employees attendance for a month (admin/HR) ──────
const getAllAttendances = async (req, res, next) => {
  try {
    const { month, year, branch_id, status } = req.query;
    const y = parseInt(year  || new Date().getFullYear());
    const m = parseInt(month || new Date().getMonth() + 1);
    const from = `${y}-${String(m).padStart(2,'0')}-01`;
    const to   = new Date(y, m, 0).toISOString().split('T')[0];

    const where = { date: { [Op.between]: [from, to] } };
    if (status) where.status = status;

    const empWhere = branch_id ? { branch_id } : undefined;

    const records = await Attendance.findAll({
      where,
      include: [{
        model: User, as: 'user',
        attributes: ['id','name','email','role'],
        required: false,
        include: [{
          model: Employee, as: 'employee',
          required: false,
          
        }],
      }],
      order: [['date','DESC'],['check_in','ASC']],
    });

    return res.json({ success: true, data: { records, period: { year: y, month: m, from, to }, total: records.length } });
  } catch (err) { next(err); }
};

module.exports = { checkIn, checkOut, breakStart, breakEnd, getToday, getHistory, getRealtimeMonitoring, getAdminMonthly, getAllAttendances, getOfficeSettingsApi, updateOfficeSettings, registerFace, getFaceStatus };