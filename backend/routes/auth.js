const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { login, register, refreshToken, logout, getMe, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Validation rules
const loginValidation = [
  body('email').isEmail().withMessage('Email tidak valid').normalizeEmail(),
  body('password').notEmpty().withMessage('Password diperlukan'),
];

const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Nama minimal 2 karakter'),
  body('email').isEmail().withMessage('Email tidak valid').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
  body('role').optional().isIn(['admin', 'hr', 'supervisor', 'employee']).withMessage('Role tidak valid'),
];

// Public routes
router.post('/login', loginValidation, login);
router.post('/register', registerValidation, register); // Protect this in production
router.post('/refresh', refreshToken);

// Protected routes
router.use(authenticate);
router.post('/logout', logout);
router.get('/me', getMe);
router.put('/change-password', [
  body('currentPassword').notEmpty().withMessage('Password saat ini diperlukan'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter'),
], changePassword);

module.exports = router;
