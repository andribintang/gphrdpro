const CompanySetting = require('../models/CompanySetting');
const https = require('https');

// ── Upload ke Cloudinary via native https (no axios needed) ───
const uploadToCloudinary = (base64Data) => new Promise((resolve) => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const preset    = process.env.CLOUDINARY_UPLOAD_PRESET || 'hrd_attendance';
    if (!cloudName) { resolve(null); return; }

    const body = JSON.stringify({
      file:          `data:image/png;base64,${base64Data}`,
      upload_preset: preset,
      folder:        'company',
    });

    const req = https.request({
      hostname: 'api.cloudinary.com',
      path:     `/v1_1/${cloudName}/image/upload`,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        try { resolve(JSON.parse(data).secure_url || null); }
        catch { resolve(null); }
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  } catch { resolve(null); }
});

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

    let logoUrl = s.logo_url;

    if (logo_base64) {
      const cleanBase64 = logo_base64.replace(/^data:image\/\w+;base64,/, '');
      const cloudUrl    = await uploadToCloudinary(cleanBase64);

      if (cloudUrl) {
        logoUrl = cloudUrl;
      } else {
        const sizeKB = Math.round(cleanBase64.length * 0.75 / 1024);
        if (sizeKB < 500) {
          logoUrl = `data:image/png;base64,${cleanBase64}`;
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
