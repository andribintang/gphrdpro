const { sequelize } = require('../config/database');
const https = require('https');

// ── Call Gemini API ───────────────────────────────────────────
const callGemini = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY tidak dikonfigurasi');

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.9, maxOutputTokens: 300 },
  });

  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const req = https.request(url, { method:'POST', headers:{'Content-Type':'application/json'} }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
          resolve(text);
        } catch(e) { reject(new Error('Gagal parse Gemini response')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

// ── Generate quote via Gemini ─────────────────────────────────
const generateQuote = async () => {
  const today = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long' });
  const prompt = `Buat 1 kata motivasi kerja yang inspiratif untuk karyawan di Indonesia.
Tanggal hari ini: ${today}
Syarat:
- Positif, membangun semangat kerja
- Singkat dan berkesan (1-2 kalimat per bahasa)
- Relevan dengan dunia kerja/bisnis/tim
- Dalam 2 bahasa: Indonesia (dominan) dan English
- Jawab HANYA dalam format JSON berikut, tanpa penjelasan tambahan:
{"id": "teks motivasi bahasa Indonesia di sini", "en": "motivational text in English here"}`;

  const raw = await callGemini(prompt);

  // Extract JSON from response
  const match = raw.match(/\{[\s\S]*"id"[\s\S]*"en"[\s\S]*\}/);
  if (!match) throw new Error('Format response Gemini tidak valid');

  const parsed = JSON.parse(match[0]);
  if (!parsed.id || !parsed.en) throw new Error('Quote tidak lengkap');

  return parsed;
};

// ── GET /api/quotes/today ─────────────────────────────────────
const getToday = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Check if already generated today
    const [[existing]] = await sequelize.query(
      `SELECT * FROM daily_quotes WHERE date = ?`,
      { replacements: [today] }
    );

    if (existing) {
      return res.json({ success:true, data:{ quote: existing, cached:true } });
    }

    // Generate via Gemini
    let quote;
    try {
      quote = await generateQuote();
    } catch(e) {
      console.warn('[Quotes] Gemini failed:', e.message);
      // Fallback quotes
      const fallbacks = [
        { id:'Kerja keras hari ini adalah investasi terbaik untuk masa depan yang cerah.', en:'Hard work today is the best investment for a brighter future.' },
        { id:'Setiap langkah kecil yang kamu ambil hari ini membawa kamu lebih dekat ke tujuanmu.', en:'Every small step you take today brings you closer to your goal.' },
        { id:'Semangat dan dedikasi adalah kunci sukses yang tidak bisa dibeli.', en:'Passion and dedication are the keys to success that cannot be bought.' },
        { id:'Bersama kita bisa mencapai hal-hal luar biasa yang tidak bisa dilakukan sendiri.', en:'Together we can achieve extraordinary things that cannot be done alone.' },
        { id:'Hari ini adalah kesempatan baru untuk menjadi lebih baik dari kemarin.', en:'Today is a new opportunity to be better than yesterday.' },
      ];
      quote = fallbacks[new Date().getDay() % fallbacks.length];
    }

    // Save to DB
    await sequelize.query(
      `INSERT INTO daily_quotes (content_id, content_en, date, generated_at, created_at)
       VALUES (?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE content_id=VALUES(content_id), content_en=VALUES(content_en), generated_at=NOW()`,
      { replacements: [quote.id, quote.en, today] }
    );

    const [[saved]] = await sequelize.query(
      `SELECT * FROM daily_quotes WHERE date = ?`,
      { replacements: [today] }
    );

    return res.json({ success:true, data:{ quote: saved, cached:false } });
  } catch(err) { next(err); }
};

// ── GET /api/quotes/history ───────────────────────────────────
const getHistory = async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT * FROM daily_quotes ORDER BY date DESC LIMIT 30`
    );
    return res.json({ success:true, data:{ quotes: rows } });
  } catch(err) { next(err); }
};

// ── POST /api/quotes/regenerate (admin) ──────────────────────
const regenerate = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    await sequelize.query(`DELETE FROM daily_quotes WHERE date = ?`, { replacements:[today] });
    // Redirect to getToday
    req.url = '/today';
    return getToday(req, res, next);
  } catch(err) { next(err); }
};

module.exports = { getToday, getHistory, regenerate };
