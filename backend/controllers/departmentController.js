const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Department = require('../models/Department');
const { Employee } = require('../models');

// ── GET all departments ───────────────────────────────────────
const getDepartments = async (req, res, next) => {
  try {
    const { search, is_active } = req.query;
    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const depts = await Department.findAll({
      where,
      order: [['sort_order','ASC'],['name','ASC']],
    });

    // Count employees per department
    const counts = await Employee.findAll({
      attributes: ['department', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { status: 'active' },
      group: ['department'],
      raw: true,
    });
    const countMap = {};
    counts.forEach(c => { countMap[c.department] = parseInt(c.count); });

    const result = depts.map(d => ({
      ...d.toJSON(),
      employee_count: countMap[d.name] || 0,
    }));

    return res.json({ success: true, data: { departments: result, total: result.length } });
  } catch (err) { next(err); }
};

// ── CREATE department ─────────────────────────────────────────
const createDepartment = async (req, res, next) => {
  try {
    const { name, code, description, head_name, sort_order } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Nama departemen wajib' });

    const existing = await Department.findOne({ where: { name: name.trim() } });
    if (existing) return res.status(409).json({ success: false, message: `Departemen "${name}" sudah ada` });

    const dept = await Department.create({
      name: name.trim(), code: code?.trim() || null,
      description: description || null, head_name: head_name || null,
      sort_order: sort_order || 0, is_active: true,
    });
    return res.status(201).json({ success: true, message: 'Departemen ditambahkan', data: { department: dept } });
  } catch (err) { next(err); }
};

// ── UPDATE department ─────────────────────────────────────────
const updateDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findByPk(req.params.id);
    if (!dept) return res.status(404).json({ success: false, message: 'Departemen tidak ditemukan' });

    const { name, code, description, head_name, is_active, sort_order } = req.body;

    // If name changes, update all employees too
    if (name && name.trim() !== dept.name) {
      const existing = await Department.findOne({ where: { name: name.trim(), id: { [Op.ne]: dept.id } } });
      if (existing) return res.status(409).json({ success: false, message: `Nama "${name}" sudah digunakan` });
      await Employee.update({ department: name.trim() }, { where: { department: dept.name } });
    }

    await dept.update({
      name:        name?.trim()        || dept.name,
      code:        code?.trim()        ?? dept.code,
      description: description         ?? dept.description,
      head_name:   head_name           ?? dept.head_name,
      is_active:   is_active           ?? dept.is_active,
      sort_order:  sort_order          ?? dept.sort_order,
    });

    return res.json({ success: true, message: 'Departemen diperbarui', data: { department: dept } });
  } catch (err) { next(err); }
};

// ── DELETE department ─────────────────────────────────────────
const deleteDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findByPk(req.params.id);
    if (!dept) return res.status(404).json({ success: false, message: 'Departemen tidak ditemukan' });

    const count = await Employee.count({ where: { department: dept.name, status: 'active' } });
    if (count > 0) return res.status(400).json({ success: false, message: `Tidak bisa dihapus — ada ${count} karyawan aktif di departemen ini` });

    await dept.destroy();
    return res.json({ success: true, message: 'Departemen dihapus' });
  } catch (err) { next(err); }
};

// ── SEED default departments ──────────────────────────────────
const seedDepartments = async (req, res, next) => {
  try {
    const defaults = [
      { name:'Technology',      code:'IT',   sort_order:1 },
      { name:'Human Resources', code:'HR',   sort_order:2 },
      { name:'Finance',         code:'FIN',  sort_order:3 },
      { name:'Operations',      code:'OPS',  sort_order:4 },
      { name:'Marketing',       code:'MKT',  sort_order:5 },
      { name:'Sales',           code:'SLS',  sort_order:6 },
      { name:'Management',      code:'MGT',  sort_order:7 },
    ];
    let created = 0;
    for (const d of defaults) {
      const [, isNew] = await Department.findOrCreate({ where: { name: d.name }, defaults: { ...d, is_active: true } });
      if (isNew) created++;
    }
    return res.json({ success: true, message: `${created} departemen default ditambahkan`, data: { created } });
  } catch (err) { next(err); }
};

module.exports = { getDepartments, createDepartment, updateDepartment, deleteDepartment, seedDepartments };
