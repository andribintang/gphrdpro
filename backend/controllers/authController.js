const jwt = require('jsonwebtoken');
const { User, Employee } = require('../models');
const { validationResult } = require('express-validator');

// Generate tokens
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return { accessToken, refreshToken };
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['id', 'nip', 'position', 'department', 'status'],
      }],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Akun Anda telah dinonaktifkan',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);

    // Store refresh token & update last login
    await user.update({
      refresh_token: refreshToken,
      last_login: new Date(),
    });

    return res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/register (admin only in prod)
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, email, password, role = 'employee' } = req.body;

    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Email sudah terdaftar',
        code: 'EMAIL_EXISTS',
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash: password,
      role,
    });

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    await user.update({ refresh_token: refreshToken });

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/refresh
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
        code: 'REFRESH_TOKEN_INVALID',
      });
    }

    const user = await User.findByPk(decoded.id);
    if (!user || user.refresh_token !== token || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token tidak valid',
        code: 'REFRESH_TOKEN_INVALID',
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.role);
    await user.update({ refresh_token: newRefreshToken });

    return res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    await req.user.update({ refresh_token: null });
    return res.json({
      success: true,
      message: 'Logout berhasil',
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    include: [{
      model: Employee,
      as: 'employee',
    }],
  });
  return res.json({
    success: true,
    data: { user },
  });
};

// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(req.user.id);
    const isValid = await user.validatePassword(currentPassword);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password saat ini tidak benar',
      });
    }

    await user.update({ password_hash: newPassword });

    return res.json({
      success: true,
      message: 'Password berhasil diubah',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, register, refreshToken, logout, getMe, changePassword };
