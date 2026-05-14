const CompanySetting = require('../models/CompanySetting');

// ── Upload ke Cloudinary via axios (lebih reliable) ───────────
const uploadToCloudinary = async (base64Data) => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const preset    = process.env.CLOUDINARY_UPLOAD_PRESET || 'hrd_attendance';
    if (!cloudName) return null;

    // Use built-in fetch (Node 18+) atau https
    const axios = require('axios');
    const resp  = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        file:          `data:image/png;base64,${base64Data}`,
        upload_preset: preset,
        folder:        'company',
      },
      { timeout: 15000 }
    );
    return resp.data?.secure_url || null;
  } catch (e) {
    console.log('Cloudinary upload skipped:', e.message);
    return null;
  }
};

// GET /api/company/settings
const getSettings = async (req, res, next) => {
  try {
    let s = await CompanySetting.findOne();
    if (!s) s = await CompanySetting.create({});
    return res.json({ success: true, data: { settings: s } });
  } catch (err) { next(err); }
};

// PUT /api/company/settings
const updateSettings = async (req, res, next) => {
  try {
    let s = await CompanySetting.findOne();
    if (!s) s = await CompanySetting.create({});

    const {
      company_name, company_tagline, company_address,
      company_phone, company_email, company_website,
      app_name, primary_color, logo_base64,
    } = req.body;

    let logoUrl = s.logo_url; // keep existing

    if (logo_base64) {
      // Strip data URI prefix if present
      const cleanBase64 = logo_base64.replace(/^data:image\/\w+;base64,/, '');

      // 1. Try Cloudinary first
      const cloudUrl = await uploadToCloudinary(cleanBase64);

      if (cloudUrl) {
        logoUrl = cloudUrl;
        console.log('✅ Logo uploaded to Cloudinary:', cloudUrl);
      } else {
        // 2. Fallback: store as data URI directly in DB
        // Compress: only store if < 500KB
        const sizeKB = Math.round(cleanBase64.length * 0.75 / 1024);
        if (sizeKB < 500) {
          logoUrl = `data:image/png;base64,${cleanBase64}`;
          console.log(`✅ Logo stored as base64 in DB (${sizeKB}KB)`);
        } else {
          console.log(`⚠️ Logo too large (${sizeKB}KB), keeping existing`);
        }
      }
    }

    await s.update({
      company_name:    company_name    ?? s.company_name,
      company_tagline: company_tagline ?? s.company_tagline,
      company_address: company_address ?? s.company_address,
      company_phone:   company_phone   ?? s.company_phone,
      company_email:   company_email   ?? s.company_email,
      company_website: company_website ?? s.company_website,
      app_name:        app_name        ?? s.app_name,
      primary_color:   primary_color   ?? s.primary_color,
      logo_url:        logoUrl,
    });

    return res.json({
      success: true,
      message: 'Pengaturan berhasil disimpan',
      data: { settings: s },
    });
  } catch (err) { next(err); }
};

module.exports = { getSettings, updateSettings };
