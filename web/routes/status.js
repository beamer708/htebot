const express = require('express');
const router = express.Router();
const config = require('../../config.json');

router.get('/status', (req, res) => {
  const client = req.app.get('discordClient');
  res.json({
    connected: true,
    bot: client && client.isReady() ? 'online' : 'offline',
    guild: 'HowToERLC',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
