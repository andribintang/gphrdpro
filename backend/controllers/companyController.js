const CompanySetting = require('../models/CompanySetting');
const https = require('https');

// ── Upload to Cloudinary ──────────────────────────────────────
const uploadToCloudinary = async (base64Image, folder = 'company') => {
  return new Promise((resolve) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const preset    = process.env.CLOUDINARY_UPLOAD_PRESET || 'hrd_attendance';
    if (!cloudName || !base64Image) { resolve(null); return; }

    const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const body = JSON.stringify({
      file: `data:image/png;base64,${imageData}`,
      upload_preset: preset,
      folder,
      transformation: 'w_400,h_400,c_fit',
    });

    const req = https.request({
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${cloudName}/image/upload`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        try { resolve(JSON.parse(data).secure_url || null); } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
    req.write(body); req.end();
  });
};

// GET /api/company/settings — public (untuk load branding di frontend)
const getSettings = async (req, res, next) => {
  try {
    let settings = await CompanySetting.findOne();
    if (!settings) {
      settings = await CompanySetting.create({});
    }
    return res.json({ success: true, data: { settings } });
  } catch (err) { next(err); }
};

// PUT /api/company/settings — admin only
const updateSettings = async (req, res, next) => {
  try {
    let settings = await CompanySetting.findOne();
    if (!settings) settings = await CompanySetting.create({});

    const {
      company_name, company_tagline, company_address,
      company_phone, company_email, company_website,
      app_name, primary_color, logo_base64,
    } = req.body;

    // Upload logo jika ada
    let logoUrl = settings.logo_url;
    if (logo_base64) {
      const uploaded = await uploadToCloudinary(logo_base64, 'company');
      if (uploaded) logoUrl = uploaded;
    }

    await settings.update({
      company_name:    company_name    ?? settings.company_name,
      company_tagline: company_tagline ?? settings.company_tagline,
      company_address: company_address ?? settings.company_address,
      company_phone:   company_phone   ?? settings.company_phone,
      company_email:   company_email   ?? settings.company_email,
      company_website: company_website ?? settings.company_website,
      app_name:        app_name        ?? settings.app_name,
      primary_color:   primary_color   ?? settings.primary_color,
      logo_url:        logoUrl,
    });

    return res.json({
      success: true,
      message: 'Pengaturan perusahaan berhasil disimpan',
      data: { settings },
    });
  } catch (err) { next(err); }
};

module.exports = { getSettings, updateSettings };
