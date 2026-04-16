const express = require('express');
const fs = require('fs');
const path = require('path');
const sessionAuth = require('../middleware/sessionAuth');
const router = express.Router();

const dataPath = (file) => path.join(__dirname, '..', '..', 'data', file);

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(dataPath(file), 'utf8')); } catch { return []; }
}

function readAnalytics() {
  try { return JSON.parse(fs.readFileSync(dataPath('analytics.json'), 'utf8')); } catch { return { hits: 0, dailyHits: {} }; }
}

function trackHit() {
  const analytics = readAnalytics();
  analytics.hits = (analytics.hits || 0) + 1;
  const today = new Date().toISOString().split('T')[0];
  analytics.dailyHits = analytics.dailyHits || {};
  analytics.dailyHits[today] = (analytics.dailyHits[today] || 0) + 1;
  fs.writeFileSync(dataPath('analytics.json'), JSON.stringify(analytics, null, 2));
}

router.use(sessionAuth);

router.get('/', (req, res) => {
  trackHit();
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      avatar: req.user.avatar,
    },
    links: {
      analytics: '/admin/analytics',
      applications: '/admin/applications',
      suggestions: '/admin/suggestions',
    },
  });
});

router.get('/analytics', (req, res) => {
  const analytics = readAnalytics();
  const applications = readJSON('applications.json');
  const suggestions = readJSON('suggestions.json');
  const partnerships = readJSON('partnerships.json');

  const totalVotes = suggestions.reduce((acc, s) => {
    const up = (s.votes?.up?.length || 0);
    const down = (s.votes?.down?.length || 0);
    return { up: acc.up + up, down: acc.down + down };
  }, { up: 0, down: 0 });

  res.json({
    success: true,
    data: {
      totalHits: analytics.hits || 0,
      dailyHits: analytics.dailyHits || {},
      applications: {
        total: applications.length,
        pending: applications.filter(a => a.status === 'pending').length,
        accepted: applications.filter(a => a.status === 'accepted').length,
        denied: applications.filter(a => a.status === 'denied').length,
      },
      suggestions: {
        total: suggestions.length,
        pending: suggestions.filter(s => s.status === 'pending').length,
        approved: suggestions.filter(s => s.status === 'approved').length,
        declined: suggestions.filter(s => s.status === 'declined').length,
        totalUpvotes: totalVotes.up,
        totalDownvotes: totalVotes.down,
      },
      partnerships: {
        total: partnerships.length,
        pending: partnerships.filter(p => p.status === 'pending').length,
        approved: partnerships.filter(p => p.status === 'approved').length,
        denied: partnerships.filter(p => p.status === 'denied').length,
      },
    },
  });
});

router.get('/applications', (req, res) => {
  const applications = readJSON('applications.json');
  res.json({ success: true, data: applications });
});

router.get('/suggestions', (req, res) => {
  const suggestions = readJSON('suggestions.json');
  res.json({ success: true, data: suggestions });
});

router.get('/partnerships', (req, res) => {
  const partnerships = readJSON('partnerships.json');
  res.json({ success: true, data: partnerships });
});

module.exports = router;
