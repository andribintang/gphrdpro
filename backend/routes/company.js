const express = require('express');
const router  = express.Router();
const { getSettings, updateSettings } = require('../controllers/companyController');
const { authenticate, authorize }     = require('../middleware/auth');

// Public — frontend load branding saat startup
router.get('/settings', getSettings);

// Protected — only admin can update
router.put('/settings', authenticate, authorize('admin'), updateSettings);

module.exports = router;
