const jwt = require('jsonwebtoken');
const { StoreCustomer } = require('../models/store');

const JWT_SECRET = process.env.JWT_SECRET || 'gphrdpro_secret';

// Hard authenticate — 401 if no valid token
const authenticateCustomer = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    if (decoded.type !== 'store_customer') return res.status(401).json({ success: false, message: 'Token tidak valid' });
    const customer = await StoreCustomer.findOne({ where: { id: decoded.id, is_active: true }, attributes: { exclude: ['password'] } });
    if (!customer) return res.status(401).json({ success: false, message: 'Akun tidak ditemukan' });
    req.customer = customer;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token tidak valid atau kadaluarsa' });
  }
};

// Soft authenticate — attach customer if token exists, continue anyway (for cart/public routes)
const softAuthenticateCustomer = async (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.slice(7), JWT_SECRET);
      if (decoded.type === 'store_customer') {
        const customer = await StoreCustomer.findOne({ where: { id: decoded.id, is_active: true }, attributes: { exclude: ['password'] } });
        if (customer) req.customer = customer;
      }
    } catch { /* ignore */ }
  }
  next();
};

module.exports = { authenticateCustomer, softAuthenticateCustomer };
