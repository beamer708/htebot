const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/discord', passport.authenticate('discord'));

router.get('/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/auth/error' }),
  (req, res) => {
    res.redirect('/admin');
  }
);

router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

router.get('/error', (req, res) => {
  res.status(401).json({ success: false, error: 'Discord authentication failed. Make sure you are a staff member in the HowToERLC Discord.' });
});

module.exports = router;
