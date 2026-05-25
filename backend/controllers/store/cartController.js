const { StoreCart, StoreProduct } = require('../../models/store');

// GET /api/store/cart
const getCart = async (req, res, next) => {
  try {
    const where = req.customer ? { customer_id: req.customer.id } : { session_id: req.headers['x-session-id'] };
    const items = await StoreCart.findAll({
      where,
      include: [{
        association: 'product',
        attributes: ['id','name','slug','images','price','stock','is_active'],
      }],
    });
    const subtotal = items.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);
    return res.json({ success: true, data: { items, subtotal, count: items.length } });
  } catch (err) { next(err); }
};

// POST /api/store/cart
const addToCart = async (req, res, next) => {
  try {
    const { product_id, variant = {}, quantity = 1, brand } = req.body;
    if (!product_id || !brand) return res.status(400).json({ success: false, message: 'product_id dan brand wajib diisi' });
    const product = await StoreProduct.findOne({ where: { id: product_id, brand, is_active: true } });
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    if (product.stock < quantity) return res.status(400).json({ success: false, message: 'Stok tidak cukup' });

    const where = {
      product_id,
      variant: JSON.stringify(variant),
      ...(req.customer ? { customer_id: req.customer.id } : { session_id: req.headers['x-session-id'] }),
    };
    let item = await StoreCart.findOne({ where });
    if (item) {
      await item.update({ quantity: item.quantity + parseInt(quantity) });
    } else {
      item = await StoreCart.create({
        ...where,
        brand,
        quantity: parseInt(quantity),
        price: product.price,
      });
    }
    return res.json({ success: true, data: { item } });
  } catch (err) { next(err); }
};

// PATCH /api/store/cart/:id
const updateCart = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const where = { id: req.params.id, ...(req.customer ? { customer_id: req.customer.id } : { session_id: req.headers['x-session-id'] }) };
    const item = await StoreCart.findOne({ where });
    if (!item) return res.status(404).json({ success: false, message: 'Item tidak ditemukan' });
    if (quantity <= 0) { await item.destroy(); return res.json({ success: true, message: 'Item dihapus' }); }
    await item.update({ quantity: parseInt(quantity) });
    return res.json({ success: true, data: { item } });
  } catch (err) { next(err); }
};

// DELETE /api/store/cart/:id
const removeFromCart = async (req, res, next) => {
  try {
    const where = { id: req.params.id, ...(req.customer ? { customer_id: req.customer.id } : { session_id: req.headers['x-session-id'] }) };
    const item = await StoreCart.findOne({ where });
    if (!item) return res.status(404).json({ success: false, message: 'Item tidak ditemukan' });
    await item.destroy();
    return res.json({ success: true, message: 'Item dihapus dari keranjang' });
  } catch (err) { next(err); }
};

// DELETE /api/store/cart (clear all)
const clearCart = async (req, res, next) => {
  try {
    const where = req.customer ? { customer_id: req.customer.id } : { session_id: req.headers['x-session-id'] };
    await StoreCart.destroy({ where });
    return res.json({ success: true, message: 'Keranjang dikosongkan' });
  } catch (err) { next(err); }
};

module.exports = { getCart, addToCart, updateCart, removeFromCart, clearCart };
