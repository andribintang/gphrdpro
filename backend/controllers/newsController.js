const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { User, Employee } = require('../models');

// ── GET /api/news ─────────────────────────────────────────────
const getNews = async (req, res, next) => {
  try {
    const { page=1, limit=20, category, published_only='true' } = req.query;
    const where = [];
    if (published_only === 'true') where.push('n.is_published = 1');
    if (category) where.push(`n.category = '${category}'`);

    const offset = (parseInt(page)-1) * parseInt(limit);
    const userId = req.user.id;

    const [rows] = await sequelize.query(`
      SELECT n.*,
        u.name AS author_name,
        (SELECT COUNT(*) FROM news_likes nl WHERE nl.news_id = n.id) AS like_count,
        (SELECT COUNT(*) FROM news_reads nr WHERE nr.news_id = n.id) AS read_count,
        (SELECT COUNT(*) FROM news_likes nl2 WHERE nl2.news_id = n.id AND nl2.user_id = ${userId}) AS user_liked,
        (SELECT COUNT(*) FROM news_reads nr2 WHERE nr2.news_id = n.id AND nr2.user_id = ${userId}) AS user_read
      FROM company_news n
      LEFT JOIN users u ON u.id = n.created_by
      ${where.length ? 'WHERE '+where.join(' AND ') : ''}
      ORDER BY n.published_at DESC, n.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `);

    const [[{total}]] = await sequelize.query(`
      SELECT COUNT(*) AS total FROM company_news n
      ${where.length ? 'WHERE '+where.join(' AND ') : ''}
    `);

    return res.json({ success:true, data:{ news:rows, pagination:{ total, page:parseInt(page), totalPages:Math.ceil(total/parseInt(limit)) } } });
  } catch(err) { next(err); }
};

// ── GET /api/news/:id ─────────────────────────────────────────
const getNewsDetail = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [[news]] = await sequelize.query(`
      SELECT n.*,
        u.name AS author_name,
        (SELECT COUNT(*) FROM news_likes nl WHERE nl.news_id = n.id) AS like_count,
        (SELECT COUNT(*) FROM news_reads nr WHERE nr.news_id = n.id) AS read_count,
        (SELECT COUNT(*) FROM news_likes nl2 WHERE nl2.news_id = n.id AND nl2.user_id = ${userId}) AS user_liked,
        (SELECT COUNT(*) FROM news_reads nr2 WHERE nr2.news_id = n.id AND nr2.user_id = ${userId}) AS user_read
      FROM company_news n
      LEFT JOIN users u ON u.id = n.created_by
      WHERE n.id = ${req.params.id}
    `);
    if (!news) return res.status(404).json({ success:false, message:'News tidak ditemukan' });

    // Auto mark as read
    await sequelize.query(`
      INSERT IGNORE INTO news_reads (user_id, news_id, read_at)
      VALUES (${userId}, ${req.params.id}, NOW())
    `);

    return res.json({ success:true, data:{ news } });
  } catch(err) { next(err); }
};

// ── POST /api/news ────────────────────────────────────────────
const createNews = async (req, res, next) => {
  try {
    const { title, content, cover_url, category='pengumuman', is_published=false } = req.body;
    if (!title||!content) return res.status(400).json({ success:false, message:'Title dan content wajib' });

    const [result] = await sequelize.query(`
      INSERT INTO company_news (title, content, cover_url, category, is_published, created_by, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, { replacements:[title, content, cover_url||null, category, is_published?1:0, req.user.id, is_published?new Date():null] });

    const newsId = result;

    // Send notification if published
    if (is_published) {
      try {
        await sequelize.query(`
          INSERT INTO notifications (user_id, type, title, message, data, created_at)
          SELECT u.id, 'news', ?, ?, ?, NOW()
          FROM users u
          WHERE u.id != ${req.user.id} AND u.role IN ('admin','hr','supervisor','employee')
        `, { replacements:[
          `📢 ${title}`,
          content.replace(/<[^>]*>/g, '').slice(0, 100) + '...',
          JSON.stringify({ news_id: newsId, category }),
        ]});
      } catch(e) { console.warn('Notif failed:', e.message); }
    }

    const [[news]] = await sequelize.query(`SELECT * FROM company_news WHERE id = ${newsId}`);
    return res.status(201).json({ success:true, message:'News berhasil dibuat', data:{ news } });
  } catch(err) { next(err); }
};

// ── PUT /api/news/:id ─────────────────────────────────────────
const updateNews = async (req, res, next) => {
  try {
    const { title, content, cover_url, category, is_published } = req.body;
    const [[existing]] = await sequelize.query(`SELECT * FROM company_news WHERE id = ?`, { replacements:[req.params.id] });
    if (!existing) return res.status(404).json({ success:false, message:'News tidak ditemukan' });

    const wasPublished = existing.is_published;
    const nowPublished = is_published !== undefined ? !!is_published : !!existing.is_published;

    await sequelize.query(`
      UPDATE company_news SET
        title = ?, content = ?, cover_url = ?, category = ?,
        is_published = ?, published_at = ?,
        updated_at = NOW()
      WHERE id = ?
    `, { replacements:[
      title||existing.title, content||existing.content,
      cover_url!==undefined?cover_url:existing.cover_url,
      category||existing.category, nowPublished?1:0,
      nowPublished && !wasPublished ? new Date() : existing.published_at,
      req.params.id,
    ]});

    // Notify if just published
    if (!wasPublished && nowPublished) {
      try {
        await sequelize.query(`
          INSERT INTO notifications (user_id, type, title, message, data, created_at)
          SELECT u.id, 'news', ?, ?, ?, NOW()
          FROM users u WHERE u.id != ${req.user.id}
        `, { replacements:[
          `📢 ${title||existing.title}`,
          (content||existing.content).replace(/<[^>]*>/g,'').slice(0,100)+'...',
          JSON.stringify({ news_id: req.params.id }),
        ]});
      } catch(e) {}
    }

    const [[news]] = await sequelize.query(`SELECT * FROM company_news WHERE id = ?`, { replacements:[req.params.id] });
    return res.json({ success:true, message:'News diperbarui', data:{ news } });
  } catch(err) { next(err); }
};

// ── DELETE /api/news/:id ──────────────────────────────────────
const deleteNews = async (req, res, next) => {
  try {
    await sequelize.query(`DELETE FROM news_likes WHERE news_id = ?`, { replacements:[req.params.id] });
    await sequelize.query(`DELETE FROM news_reads WHERE news_id = ?`, { replacements:[req.params.id] });
    await sequelize.query(`DELETE FROM company_news WHERE id = ?`, { replacements:[req.params.id] });
    return res.json({ success:true, message:'News dihapus' });
  } catch(err) { next(err); }
};

// ── POST /api/news/:id/like ───────────────────────────────────
const toggleLike = async (req, res, next) => {
  try {
    const [[existing]] = await sequelize.query(
      `SELECT id FROM news_likes WHERE user_id = ? AND news_id = ?`,
      { replacements:[req.user.id, req.params.id] }
    );
    if (existing) {
      await sequelize.query(`DELETE FROM news_likes WHERE user_id = ? AND news_id = ?`, { replacements:[req.user.id, req.params.id] });
      return res.json({ success:true, liked:false });
    } else {
      await sequelize.query(`INSERT INTO news_likes (user_id, news_id, created_at) VALUES (?, ?, NOW())`, { replacements:[req.user.id, req.params.id] });
      return res.json({ success:true, liked:true });
    }
  } catch(err) { next(err); }
};

// ── GET /api/news/:id/stats (admin/hr) ───────────────────────
const getNewsStats = async (req, res, next) => {
  try {
    const [readers] = await sequelize.query(`
      SELECT u.name, u.id, nr.read_at
      FROM news_reads nr
      JOIN users u ON u.id = nr.user_id
      WHERE nr.news_id = ?
      ORDER BY nr.read_at DESC
    `, { replacements:[req.params.id] });

    const [likers] = await sequelize.query(`
      SELECT u.name, u.id, nl.created_at
      FROM news_likes nl
      JOIN users u ON u.id = nl.user_id
      WHERE nl.news_id = ?
    `, { replacements:[req.params.id] });

    return res.json({ success:true, data:{ readers, likers } });
  } catch(err) { next(err); }
};

module.exports = { getNews, getNewsDetail, createNews, updateNews, deleteNews, toggleLike, getNewsStats };
