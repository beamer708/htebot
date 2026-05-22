// server.js
const express = require('express');
const { handleDirectory }  = require('./handlers/directory');
const { handleResource }   = require('./handlers/resources');
const { handleTool }       = require('./handlers/tools');
const { handleTemplate }   = require('./handlers/templates');
const { handleMarketplace } = require('./handlers/marketplace');

// ── Auth middleware ───────────────────────────────────────────────────────────
function auth(req, res, next) {
  const secret = req.headers['x-bot-secret'];
  if (!secret || secret !== process.env.BOT_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }
  next();
}

// ── Server bootstrap ──────────────────────────────────────────────────────────
function startServer(client) {
  const app = express();
  app.use(express.json({ limit: '50kb' }));

  // Health check (no auth required)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', bot: client.user?.tag ?? 'unknown' });
  });

  // Notify routes (auth required)
  app.post('/directory',   auth, (req, res) => handleDirectory(client, req, res));
  app.post('/resources',   auth, (req, res) => handleResource(client, req, res));
  app.post('/tools',       auth, (req, res) => handleTool(client, req, res));
  app.post('/templates',   auth, (req, res) => handleTemplate(client, req, res));
  app.post('/marketplace', auth, (req, res) => handleMarketplace(client, req, res));

  // 404 fallback
  app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found.' });
  });

  // BOT_PORT is separate from PORT (which the existing web/server.js uses)
  const port = process.env.BOT_PORT || 3001;
  app.listen(port, () => {
    console.log(`[NotifyServer] Listening on port ${port}`);
  });
}

module.exports = { startServer };
