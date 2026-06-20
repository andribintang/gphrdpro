const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const { Customer, Order, OrderItem } = require('../../models/erp');

// ── Helper: parse tags safely ─────────────────────────────────
const parseTags = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const serializeTags = (tags) => {
  if (!tags) return null;
  if (typeof tags === 'string') {
    try { JSON.parse(tags); return tags; } // already JSON
    catch { return JSON.stringify([tags]); }
  }
  return JSON.stringify(Array.isArray(tags) ? tags : []);
};

// ── Normalize phone (62xxx) ───────────────────────────────────
const normalizePhone = (raw) => {
  if (!raw) return null;
  let p = String(raw).replace(/[\s\-()+]/g, '');
  if (p.startsWith('08')) p = '628' + p.slice(2);
  else if (p.startsWith('8') && p.length >= 9) p = '62' + p;
  else if (p.startsWith('+62')) p = p.slice(1);
  return p;
};

// ═══════════════════════════════════════════════════════════════
// GET /api/erp/customers
// Filter: search, city, province_code, source, has_phone, tag,
//         segment(champion|loyal|at_risk|lost|new)
// Returns each customer with last_order_date (subquery)
// ═══════════════════════════════════════════════════════════════
const getCustomers = async (req, res, next) => {
  try {
    const {
      search, city, province_code, source, has_phone, tag,
      limit = 500, page = 1,
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(2000, Math.max(1, parseInt(limit) || 500));
    const offset   = (pageNum - 1) * limitNum;

    let where = '1=1';
    if (search) {
      const s = sequelize.escape('%' + search + '%');
      where += ` AND (c.name LIKE ${s} OR c.phone LIKE ${s} OR c.email LIKE ${s} OR c.city LIKE ${s})`;
    }
    if (city)          where += ` AND c.city = ${sequelize.escape(city)}`;
    if (province_code) where += ` AND c.province_code = ${sequelize.escape(province_code)}`;
    if (source)        where += ` AND c.source = ${sequelize.escape(source)}`;
    if (has_phone === 'true')  where += ` AND c.phone IS NOT NULL AND c.phone != ''`;
    if (has_phone === 'false') where += ` AND (c.phone IS NULL OR c.phone = '')`;
    if (tag)           where += ` AND c.tags LIKE ${sequelize.escape('%"' + tag + '"%')}`;

    const [[{ total }]] = await sequelize.query(
      `SELECT COUNT(*) as total FROM erp_customers c WHERE ${where}`
    );

    const [rows] = await sequelize.query(`
      SELECT c.*,
        (SELECT MAX(o.order_date) FROM erp_orders o
          WHERE o.customer_id = c.id
            AND o.status IN ('confirmed','processing','shipped','completed')
        ) AS last_order_date
      FROM erp_customers c
      WHERE ${where}
      ORDER BY c.name ASC
      LIMIT ${limitNum} OFFSET ${offset}
    `);

    const customers = rows.map(r => ({
      ...r,
      tags: parseTags(r.tags),
      total_orders: parseInt(r.total_orders) || 0,
      total_spent:  parseFloat(r.total_spent) || 0,
    }));

    return res.json({ success: true, data: { customers, total: parseInt(total) } });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/erp/customers/:id
// Detail customer + extended stats
// ═══════════════════════════════════════════════════════════════
const getCustomerDetail = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });

    // Aggregate stats from orders
    const [[stats]] = await sequelize.query(`
      SELECT
        COUNT(*) AS order_count,
        COALESCE(SUM(total_amount), 0) AS total_spent,
        COALESCE(AVG(total_amount), 0) AS avg_order_value,
        MIN(order_date) AS first_order_date,
        MAX(order_date) AS last_order_date
      FROM erp_orders
      WHERE customer_id = ${parseInt(req.params.id)}
        AND status IN ('confirmed','processing','shipped','completed')
    `);

    // Order count per channel
    const [byChannel] = await sequelize.query(`
      SELECT channel, COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS revenue
      FROM erp_orders
      WHERE customer_id = ${parseInt(req.params.id)}
        AND status IN ('confirmed','processing','shipped','completed')
      GROUP BY channel
    `);

    // Top 5 produk yang sering dibeli
    const [favoriteProducts] = await sequelize.query(`
      SELECT oi.product_name, SUM(oi.qty) AS total_qty, SUM(oi.subtotal) AS total_value
      FROM erp_order_items oi
      JOIN erp_orders o ON o.id = oi.order_id
      WHERE o.customer_id = ${parseInt(req.params.id)}
        AND o.status IN ('confirmed','processing','shipped','completed')
      GROUP BY oi.product_name
      ORDER BY total_qty DESC
      LIMIT 5
    `);

    const data = customer.toJSON();
    data.tags = parseTags(data.tags);
    data.stats = {
      order_count:      parseInt(stats.order_count) || 0,
      total_spent:      parseFloat(stats.total_spent) || 0,
      avg_order_value:  parseFloat(stats.avg_order_value) || 0,
      first_order_date: stats.first_order_date,
      last_order_date:  stats.last_order_date,
      by_channel:       byChannel.map(b => ({
        channel: b.channel,
        count: parseInt(b.count) || 0,
        revenue: parseFloat(b.revenue) || 0,
      })),
      favorite_products: favoriteProducts.map(p => ({
        product_name: p.product_name,
        total_qty: parseInt(p.total_qty) || 0,
        total_value: parseFloat(p.total_value) || 0,
      })),
    };

    return res.json({ success: true, data: { customer: data } });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/erp/customers/:id/orders
// Order history (paginated)
// ═══════════════════════════════════════════════════════════════
const getCustomerOrders = async (req, res, next) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const pageNum  = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const { count, rows } = await Order.findAndCountAll({
      where: { customer_id: req.params.id },
      attributes: [
        'id', 'order_no', 'order_date', 'channel', 'sub_channel_name',
        'status', 'total_amount', 'subtotal', 'discount_amount', 'shipping_cost',
        'branch_id',
      ],
      order: [['order_date', 'DESC'], ['id', 'DESC']],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    });

    return res.json({
      success: true,
      data: {
        orders: rows,
        total: count,
        page: pageNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/erp/customers
// Tambah customer + duplicate check
// ═══════════════════════════════════════════════════════════════
const createCustomer = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (!body.name?.trim()) {
      return res.status(400).json({ success: false, message: 'Nama wajib diisi' });
    }

    // Normalize & duplicate check by phone
    if (body.phone) {
      const normalized = normalizePhone(body.phone);
      const existing = await Customer.findOne({
        where: {
          [Op.or]: [
            { phone: body.phone },
            { phone: normalized },
          ],
        },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Pelanggan dengan nomor HP serupa sudah ada: ${existing.name}`,
          code: 'DUPLICATE_PHONE',
          data: { existing: { id: existing.id, name: existing.name, phone: existing.phone } },
        });
      }
    }

    body.tags = serializeTags(body.tags);
    const customer = await Customer.create(body);
    return res.status(201).json({ success: true, message: 'Pelanggan ditambahkan', data: { customer } });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// PUT /api/erp/customers/:id
// ═══════════════════════════════════════════════════════════════
const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });

    const body = { ...req.body };
    if (body.tags !== undefined) body.tags = serializeTags(body.tags);

    await customer.update(body);
    return res.json({ success: true, message: 'Pelanggan diperbarui', data: { customer } });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// DELETE /api/erp/customers/:id
// Soft check: tolak hapus jika punya order
// ═══════════════════════════════════════════════════════════════
const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });

    const orderCount = await Order.count({ where: { customer_id: customer.id } });
    if (orderCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Tidak bisa dihapus — pelanggan punya ${orderCount} riwayat order. Hapus order terkait dulu atau tandai non-aktif.`,
        code: 'HAS_ORDERS',
      });
    }

    await customer.destroy();
    return res.json({ success: true, message: 'Pelanggan dihapus' });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/erp/customers/check-duplicate?phone=xxx&name=yyy
// Untuk realtime check di form
// ═══════════════════════════════════════════════════════════════
const checkDuplicate = async (req, res, next) => {
  try {
    const { phone, name, exclude_id } = req.query;
    const conditions = [];

    if (phone) {
      const normalized = normalizePhone(phone);
      conditions.push({ phone: { [Op.in]: [phone, normalized].filter(Boolean) } });
    }
    if (name && name.trim().length >= 3) {
      conditions.push({ name: { [Op.like]: `%${name.trim()}%` } });
    }
    if (conditions.length === 0) {
      return res.json({ success: true, data: { matches: [] } });
    }

    const where = { [Op.or]: conditions };
    if (exclude_id) where.id = { [Op.ne]: parseInt(exclude_id) };

    const matches = await Customer.findAll({
      where,
      attributes: ['id', 'name', 'phone', 'city', 'total_orders'],
      limit: 5,
    });

    return res.json({ success: true, data: { matches } });
  } catch (err) { next(err); }
};

module.exports = {
  getCustomers,
  getCustomerDetail,
  getCustomerOrders,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  checkDuplicate,
};
