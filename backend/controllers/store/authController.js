const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { StoreCustomer, StoreAddress } = require('../../models/store');

const JWT_SECRET  = process.env.JWT_SECRET || 'gphrdpro_secret';
const JWT_EXPIRES = '30d';

const makeToken = (customer) =>
  jwt.sign({ id: customer.id, email: customer.email, type: 'store_customer' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

// POST /api/store/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Nama, email dan password wajib diisi' });
    const exist = await StoreCustomer.findOne({ where: { email } });
    if (exist) return res.status(409).json({ success: false, message: 'Email sudah terdaftar' });
    const hashed = await bcrypt.hash(password, 10);
    const customer = await StoreCustomer.create({ name, email, phone, password: hashed });
    const token = makeToken(customer);
    return res.status(201).json({
      success: true,
      data: { token, customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone } }
    });
  } catch (err) { next(err); }
};

// POST /api/store/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
    const customer = await StoreCustomer.findOne({ where: { email, is_active: true } });
    if (!customer) return res.status(401).json({ success: false, message: 'Email atau password salah' });
    const valid = await bcrypt.compare(password, customer.password);
    if (!valid) return res.status(401).json({ success: false, message: 'Email atau password salah' });
    await customer.update({ last_login_at: new Date() });
    const token = makeToken(customer);
    return res.json({
      success: true,
      data: { token, customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone } }
    });
  } catch (err) { next(err); }
};

// GET /api/store/customer/profile
const getProfile = async (req, res, next) => {
  try {
    const customer = await StoreCustomer.findByPk(req.customer.id, {
      attributes: { exclude: ['password'] },
      include: [{ association: 'addresses' }],
    });
    return res.json({ success: true, data: { customer } });
  } catch (err) { next(err); }
};

// PUT /api/store/customer/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const customer = await StoreCustomer.findByPk(req.customer.id);
    await customer.update({ name: name ?? customer.name, phone: phone ?? customer.phone });
    return res.json({ success: true, data: { customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone } } });
  } catch (err) { next(err); }
};

// POST /api/store/customer/addresses
const addAddress = async (req, res, next) => {
  try {
    const { label, recipient, phone, province_id, province, city_id, city, district, postal_code, address, is_default } = req.body;
    if (is_default) await StoreAddress.update({ is_default: false }, { where: { customer_id: req.customer.id } });
    const addr = await StoreAddress.create({ customer_id: req.customer.id, label, recipient, phone, province_id, province, city_id, city, district, postal_code, address, is_default: !!is_default });
    return res.status(201).json({ success: true, data: { address: addr } });
  } catch (err) { next(err); }
};

// PUT /api/store/customer/addresses/:id
const updateAddress = async (req, res, next) => {
  try {
    const addr = await StoreAddress.findOne({ where: { id: req.params.id, customer_id: req.customer.id } });
    if (!addr) return res.status(404).json({ success: false, message: 'Alamat tidak ditemukan' });
    if (req.body.is_default) await StoreAddress.update({ is_default: false }, { where: { customer_id: req.customer.id } });
    await addr.update(req.body);
    return res.json({ success: true, data: { address: addr } });
  } catch (err) { next(err); }
};

// DELETE /api/store/customer/addresses/:id
const deleteAddress = async (req, res, next) => {
  try {
    const addr = await StoreAddress.findOne({ where: { id: req.params.id, customer_id: req.customer.id } });
    if (!addr) return res.status(404).json({ success: false, message: 'Alamat tidak ditemukan' });
    await addr.destroy();
    return res.json({ success: true, message: 'Alamat dihapus' });
  } catch (err) { next(err); }
};

module.exports = { register, login, getProfile, updateProfile, addAddress, updateAddress, deleteAddress };
