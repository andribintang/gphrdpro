const express = require('express');
const router  = express.Router();
const https   = require('https');
const { authenticate } = require('../middleware/auth');

// POST /api/ai/chat — proxy to Anthropic (avoids CORS)
router.post('/chat', authenticate, (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY tidak dikonfigurasi' });

  const body = JSON.stringify(req.body);
  const options = {
    hostname: 'api.anthropic.com',
    path:     '/v1/messages',
    method:   'POST',
    headers: {
      'Content-Type':      'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key':         apiKey,
      'Content-Length':    Buffer.byteLength(body),
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (e) => res.status(500).json({ error: e.message }));
  proxyReq.write(body);
  proxyReq.end();
});

module.exports = router;
