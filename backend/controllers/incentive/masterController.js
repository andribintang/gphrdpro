const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const {
  Branch, Position, IncEmployee, SalesChannel,
  ActivityType, BonusTarget, AuditLog, ChannelRate,
} = require('../../models/incentive');

// ── Audit helper ──────────────────────────────────────────────
const audit = async (req, action, module, recordId, desc, oldVal, newVal) => {
  try {
    await AuditLog.create({
      user_id: req.user?.id, user_name: req.user?.name,
      action, module, record_id: recordId,
      description: desc, old_value: oldVal, new_value: newVal,
      ip_address: req.ip,
    });
  } catch {}
};

// ─────────────────────────────────────────────────────────────
// BRANCHES
// ─────────────────────────────────────────────────────────────
const getBranches = async (req, res, next) => {
  try {
    const rows = await Branch.findAll({
      include: [{ model: Position, as: 'positions', required: false }],
      order: [['sort_order', 'ASC'], ['name', 'ASC']],
    });
    // Add employee count
    const counts = await IncEmployee.findAll({
      attributes: ['branch_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { is_active: true },
      group: ['branch_id'],
      raw: true,
    });
    const countMap = {};
    counts.forEach(c => { countMap[c.branch_id] = parseInt(c.count); });
    const data = rows.map(b => ({ ...b.toJSON(), employee_count: countMap[b.id] || 0 }));
    return res.json({ success: true, data: { branches: data } });
  } catch (err) { next(err); }
};

const createBranch = async (req, res, next) => {
  try {
    const { code, name, business_type, address, phone, email } = req.body;
    const exists = await Branch.findOne({ where: { code: code?.toUpperCase() } });
    if (exists) return res.status(409).json({ success: false, message: 'Kode cabang sudah ada' });
    const branch = await Branch.create({ code: code.toUpperCase(), name, business_type, address, phone, email });
    await audit(req, 'CREATE', 'branches', branch.id, `Cabang ${name} dibuat`);
    return res.status(201).json({ success: true, message: `Cabang ${name} berhasil dibuat`, data: { branch } });
  } catch (err) { next(err); }
};

const updateBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: 'Cabang tidak ditemukan' });
    const old = branch.toJSON();
    await branch.update(req.body);
    await audit(req, 'UPDATE', 'branches', branch.id, `Cabang ${branch.name} diupdate`, old, req.body);
    return res.json({ success: true, message: 'Cabang berhasil diperbarui', data: { branch } });
  } catch (err) { next(err); }
};

const deleteBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: 'Cabang tidak ditemukan' });
    const empCount = await IncEmployee.count({ where: { branch_id: branch.id } });
    if (empCount > 0) return res.status(400).json({ success: false, message: `Tidak bisa hapus — ada ${empCount} karyawan di cabang ini` });
    await branch.destroy();
    await audit(req, 'DELETE', 'branches', branch.id, `Cabang ${branch.name} dihapus`);
    return res.json({ success: true, message: 'Cabang berhasil dihapus' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// POSITIONS
// ─────────────────────────────────────────────────────────────
const getPositions = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.branch_id) where.branch_id = req.query.branch_id;
    const rows = await Position.findAll({
      where,
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }],
      order: [['branch_id', 'ASC'], ['level', 'ASC'], ['name', 'ASC']],
    });
    return res.json({ success: true, data: { positions: rows } });
  } catch (err) { next(err); }
};

const createPosition = async (req, res, next) => {
  try {
    const pos = await Position.create(req.body);
    await audit(req, 'CREATE', 'positions', pos.id, `Jabatan ${pos.name} dibuat`);
    return res.status(201).json({ success: true, message: `Jabatan ${pos.name} berhasil dibuat`, data: { position: pos } });
  } catch (err) { next(err); }
};

const updatePosition = async (req, res, next) => {
  try {
    const pos = await Position.findByPk(req.params.id);
    if (!pos) return res.status(404).json({ success: false, message: 'Jabatan tidak ditemukan' });
    await pos.update(req.body);
    return res.json({ success: true, message: 'Jabatan berhasil diperbarui', data: { position: pos } });
  } catch (err) { next(err); }
};

const deletePosition = async (req, res, next) => {
  try {
    const pos = await Position.findByPk(req.params.id);
    if (!pos) return res.status(404).json({ success: false, message: 'Jabatan tidak ditemukan' });
    await pos.destroy();
    return res.json({ success: true, message: 'Jabatan berhasil dihapus' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// INC EMPLOYEES
// ─────────────────────────────────────────────────────────────
const getIncEmployees = async (req, res, next) => {
  try {
    const { branch_id, is_active, search, page = 1, limit = 50 } = req.query;
    const where = {};
    if (branch_id) where.branch_id = branch_id;
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) where[Op.or] = [
      { name:  { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { employee_code: { [Op.like]: `%${search}%` } },
    ];

    const { count, rows } = await IncEmployee.findAndCountAll({
      where,
      include: [
        { model: Branch,   as: 'branch',   attributes: ['id', 'name', 'code'] },
        { model: Position, as: 'position', attributes: ['id', 'name'], required: false },
      ],
      order: [['branch_id', 'ASC'], ['name', 'ASC']],
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return res.json({
      success: true,
      data: { employees: rows, pagination: { total: count, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) } },
    });
  } catch (err) { next(err); }
};

const getIncEmployee = async (req, res, next) => {
  try {
    const emp = await IncEmployee.findByPk(req.params.id, {
      include: [
        { model: Branch,   as: 'branch' },
        { model: Position, as: 'position', required: false },
      ],
    });
    if (!emp) return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan' });
    return res.json({ success: true, data: { employee: emp } });
  } catch (err) { next(err); }
};

const createIncEmployee = async (req, res, next) => {
  try {
    const { employee_code } = req.body;
    if (employee_code) {
      const exists = await IncEmployee.findOne({ where: { employee_code } });
      if (exists) return res.status(409).json({ success: false, message: 'Kode karyawan sudah ada' });
    }
    const emp = await IncEmployee.create(req.body);
    await audit(req, 'CREATE', 'employees', emp.id, `Karyawan ${emp.name} ditambahkan`);
    return res.status(201).json({ success: true, message: `Karyawan ${emp.name} berhasil ditambahkan`, data: { employee: emp } });
  } catch (err) { next(err); }
};

const updateIncEmployee = async (req, res, next) => {
  try {
    const emp = await IncEmployee.findByPk(req.params.id);
    if (!emp) return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan' });
    const old = emp.toJSON();
    await emp.update(req.body);
    await audit(req, 'UPDATE', 'employees', emp.id, `Karyawan ${emp.name} diupdate`, old, req.body);
    return res.json({ success: true, message: 'Data karyawan berhasil diperbarui', data: { employee: emp } });
  } catch (err) { next(err); }
};

const deleteIncEmployee = async (req, res, next) => {
  try {
    const emp = await IncEmployee.findByPk(req.params.id);
    if (!emp) return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan' });
    // Soft delete
    await emp.update({ is_active: false });
    await audit(req, 'DELETE', 'employees', emp.id, `Karyawan ${emp.name} dinonaktifkan`);
    return res.json({ success: true, message: `Karyawan ${emp.name} dinonaktifkan` });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// SALES CHANNELS
// ─────────────────────────────────────────────────────────────
const getSalesChannels = async (req, res, next) => {
  try {
    const rows = await SalesChannel.findAll({ order: [['sort_order', 'ASC']] });
    return res.json({ success: true, data: { channels: rows } });
  } catch (err) { next(err); }
};

const updateSalesChannel = async (req, res, next) => {
  try {
    const ch = await SalesChannel.findByPk(req.params.id);
    if (!ch) return res.status(404).json({ success: false, message: 'Channel tidak ditemukan' });
    const old = ch.toJSON();
    await ch.update(req.body);
    await audit(req, 'UPDATE', 'sales_channels', ch.id, `Channel ${ch.name} diupdate — % dari ${old.percentage} ke ${req.body.percentage}`, old, req.body);
    return res.json({ success: true, message: 'Channel berhasil diperbarui', data: { channel: ch } });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// ACTIVITY TYPES
// ─────────────────────────────────────────────────────────────
const getActivityTypes = async (req, res, next) => {
  try {
    const rows = await ActivityType.findAll({
      where: req.query.active_only === 'true' ? { is_active: true } : {},
      order: [['sort_order', 'ASC'], ['name', 'ASC']],
    });
    return res.json({ success: true, data: { activity_types: rows } });
  } catch (err) { next(err); }
};

const createActivityType = async (req, res, next) => {
  try {
    const act = await ActivityType.create(req.body);
    await audit(req, 'CREATE', 'activity_types', act.id, `Aktivitas ${act.name} dibuat`);
    return res.status(201).json({ success: true, message: `Aktivitas ${act.name} berhasil dibuat`, data: { activity_type: act } });
  } catch (err) { next(err); }
};

const updateActivityType = async (req, res, next) => {
  try {
    const act = await ActivityType.findByPk(req.params.id);
    if (!act) return res.status(404).json({ success: false, message: 'Aktivitas tidak ditemukan' });
    await act.update(req.body);
    return res.json({ success: true, message: 'Aktivitas berhasil diperbarui', data: { activity_type: act } });
  } catch (err) { next(err); }
};

const deleteActivityType = async (req, res, next) => {
  try {
    const act = await ActivityType.findByPk(req.params.id);
    if (!act) return res.status(404).json({ success: false, message: 'Aktivitas tidak ditemukan' });
    await act.update({ is_active: false });
    return res.json({ success: true, message: 'Aktivitas dinonaktifkan' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// BONUS TARGETS
// ─────────────────────────────────────────────────────────────
const getBonusTargets = async (req, res, next) => {
  try {
    const rows = await BonusTarget.findAll({ order: [['min_amount', 'ASC']] });
    return res.json({ success: true, data: { bonus_targets: rows } });
  } catch (err) { next(err); }
};

const createBonusTarget = async (req, res, next) => {
  try {
    const bt = await BonusTarget.create(req.body);
    await audit(req, 'CREATE', 'bonus_targets', bt.id, `Bonus target ${bt.name} dibuat`);
    return res.status(201).json({ success: true, message: 'Bonus target berhasil dibuat', data: { bonus_target: bt } });
  } catch (err) { next(err); }
};

const updateBonusTarget = async (req, res, next) => {
  try {
    const bt = await BonusTarget.findByPk(req.params.id);
    if (!bt) return res.status(404).json({ success: false, message: 'Bonus target tidak ditemukan' });
    await bt.update(req.body);
    return res.json({ success: true, message: 'Bonus target berhasil diperbarui', data: { bonus_target: bt } });
  } catch (err) { next(err); }
};

const deleteBonusTarget = async (req, res, next) => {
  try {
    const bt = await BonusTarget.findByPk(req.params.id);
    if (!bt) return res.status(404).json({ success: false, message: 'Tidak ditemukan' });
    await bt.destroy();
    return res.json({ success: true, message: 'Bonus target dihapus' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// CHANNEL RATES — persentase per cabang per jalur
// ─────────────────────────────────────────────────────────────
const getChannelRates = async (req, res, next) => {
  try {
    // Return all channels with per-branch rates
    const [channels, branches, rates] = await Promise.all([
      SalesChannel.findAll({ where: { is_active: true }, order: [['sort_order','ASC']] }),
      Branch.findAll({ where: { is_active: true }, order: [['sort_order','ASC']] }),
      ChannelRate.findAll({ include: [
        { model: Branch,       as: 'branch',  attributes: ['id','name','code'] },
        { model: SalesChannel, as: 'channel', attributes: ['id','name','code'] },
      ]}),
    ]);

    // Build matrix: channel → branch → rate
    const matrix = channels.map(ch => ({
      channel: ch,
      branches: branches.map(br => {
        const rate = rates.find(r => r.channel_id === ch.id && r.branch_id === br.id);
        return {
          branch:     br,
          rate_id:    rate?.id || null,
          percentage: rate ? parseFloat(rate.percentage) : null, // null = pakai global
          is_active:  rate?.is_active ?? true,
          notes:      rate?.notes || '',
          using_global: !rate || parseFloat(rate.percentage) === 0,
        };
      }),
    }));

    return res.json({ success: true, data: { channels, branches, matrix, rates } });
  } catch (err) { next(err); }
};

const upsertChannelRate = async (req, res, next) => {
  try {
    const { branch_id, channel_id, percentage, notes } = req.body;
    if (!branch_id || !channel_id) {
      return res.status(400).json({ success: false, message: 'branch_id dan channel_id wajib diisi' });
    }

    const pct = parseFloat(percentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({ success: false, message: 'Persentase harus antara 0-100' });
    }

    const [rate, created] = await ChannelRate.findOrCreate({
      where: { branch_id, channel_id },
      defaults: { percentage: pct, notes, is_active: true },
    });

    if (!created) {
      await rate.update({ percentage: pct, notes, is_active: pct > 0 });
    }

    const channel = await SalesChannel.findByPk(channel_id);
    const branch  = await Branch.findByPk(branch_id);

    await AuditLog.create({
      user_id: req.user?.id, user_name: req.user?.name,
      action: created ? 'CREATE' : 'UPDATE',
      module: 'channel_rates',
      record_id: rate.id,
      description: `${branch?.name} — ${channel?.name}: ${pct}%`,
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Rate ${branch?.name} / ${channel?.name} → ${pct}% berhasil disimpan`,
      data: { rate },
    });
  } catch (err) { next(err); }
};

const deleteChannelRate = async (req, res, next) => {
  try {
    const rate = await ChannelRate.findByPk(req.params.id);
    if (!rate) return res.status(404).json({ success: false, message: 'Rate tidak ditemukan' });
    await rate.destroy();
    return res.json({ success: true, message: 'Rate dihapus — akan menggunakan rate global' });
  } catch (err) { next(err); }
};

// ── GET /api/incentive/share-templates ───────────────────────
const getShareTemplates = async (req, res, next) => {
  try {
    const { sequelize } = require('../../config/database');

    // Auto-create table if not exists (safe fallback)
    await sequelize.query(`CREATE TABLE IF NOT EXISTS inc_share_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id INT NOT NULL,
      channel_code ENUM('WA','MARKETPLACE','WEB') NOT NULL,
      share_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
      notes VARCHAR(255) NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_by INT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_emp_channel (employee_id, channel_code)
    )`).catch(()=>{});

    const [rows] = await sequelize.query(`
      SELECT st.*, ie.name AS employee_name, ie.nip, b.name AS branch_name
      FROM inc_share_templates st
      JOIN inc_employees ie ON ie.id = st.employee_id
      LEFT JOIN inc_branches b ON b.id = ie.branch_id
      WHERE st.is_active = 1
      ORDER BY st.channel_code, ie.name
    `);

    // Group by channel
    const byChannel = { WA: [], MARKETPLACE: [], WEB: [] };
    rows.forEach(r => { if (byChannel[r.channel_code]) byChannel[r.channel_code].push(r); });

    // Total % per channel
    const totals = {};
    Object.keys(byChannel).forEach(ch => {
      totals[ch] = byChannel[ch].reduce((s, r) => s + parseFloat(r.share_percentage), 0);
    });

    return res.json({ success: true, data: { templates: rows, byChannel, totals } });
  } catch(err) { next(err); }
};

// ── POST /api/incentive/share-templates/bulk ──────────────────
// Upsert all templates for a channel at once
const upsertShareTemplates = async (req, res, next) => {
  try {
    const { channel_code, templates } = req.body;
    if (!channel_code || !['WA','MARKETPLACE','WEB'].includes(channel_code))
      return res.status(400).json({ success: false, message: 'channel_code tidak valid' });
    if (!templates?.length)
      return res.status(400).json({ success: false, message: 'templates wajib diisi' });

    const total = templates.reduce((s, t) => s + parseFloat(t.share_percentage || 0), 0);
    if (Math.abs(total - 100) > 0.01)
      return res.status(400).json({ success: false, message: `Total porsi harus 100% (saat ini ${total.toFixed(2)}%)` });

    const { sequelize } = require('../../config/database');
    const t = await sequelize.transaction();
    try {
      // Deactivate all existing for this channel
      await sequelize.query(
        `UPDATE inc_share_templates SET is_active = 0 WHERE channel_code = ?`,
        { replacements: [channel_code], transaction: t }
      );

      for (const tmpl of templates) {
        await sequelize.query(`
          INSERT INTO inc_share_templates (employee_id, channel_code, share_percentage, notes, is_active, created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            share_percentage = VALUES(share_percentage),
            notes = VALUES(notes),
            is_active = 1,
            updated_at = NOW()
        `, { replacements: [tmpl.employee_id, channel_code, parseFloat(tmpl.share_percentage), tmpl.notes || '', req.user.id], transaction: t });
      }

      await t.commit();
      return res.json({ success: true, message: `Template porsi ${channel_code} berhasil disimpan` });
    } catch(e) { await t.rollback(); throw e; }
  } catch(err) { next(err); }
};

// ── DELETE /api/incentive/share-templates/:id ─────────────────
const deleteShareTemplate = async (req, res, next) => {
  try {
    const { sequelize } = require('../../config/database');
    await sequelize.query(`UPDATE inc_share_templates SET is_active = 0 WHERE id = ?`, { replacements: [req.params.id] });
    return res.json({ success: true, message: 'Template dihapus' });
  } catch(err) { next(err); }
};

module.exports = {
  getBranches, createBranch, updateBranch, deleteBranch,
  getChannelRates, upsertChannelRate, deleteChannelRate,
  getPositions, createPosition, updatePosition, deletePosition,
  getIncEmployees, getIncEmployee, createIncEmployee, updateIncEmployee, deleteIncEmployee,
  getSalesChannels, updateSalesChannel,
  getActivityTypes, createActivityType, updateActivityType, deleteActivityType,
  getBonusTargets, createBonusTarget, updateBonusTarget, deleteBonusTarget,
  getShareTemplates, upsertShareTemplates, deleteShareTemplate,
};
