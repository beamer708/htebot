const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const { Strategy: DiscordStrategy } = require('passport-discord');
const config = require('../config.json');

module.exports = (client) => {
  const app = express();

  // ── CORS ──────────────────────────────────────────────────────────────────
  const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
      ? (process.env.WEBSITE_URL || 'https://howtoerlc.xyz')
      : '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'X-API-SECRET', 'X-BETA-TOKEN'],
  };
  app.use(cors(corsOptions));

  // ── Body Parsing ──────────────────────────────────────────────────────────
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Session ───────────────────────────────────────────────────────────────
  app.use(session({
    secret: process.env.SESSION_SECRET || 'howtoerlc-default-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }));

  // ── Passport / Discord OAuth2 ─────────────────────────────────────────────
  passport.use(new DiscordStrategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID || 'placeholder',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || 'placeholder',
      callbackURL: process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback',
      scope: ['identify', 'guilds', 'guilds.members.read'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) return done(null, false);

        // Verify the user is a staff member in the HowToERLC guild
        const member = await guild.members.fetch(profile.id).catch(() => null);
        if (!member) return done(null, false);

        const isStaff = member.roles.cache.has(config.roles.staff)
          || member.roles.cache.has(config.roles.admin)
          || member.permissions.has('ManageGuild');

        if (!isStaff) return done(null, false);

        return done(null, profile);
      } catch (err) {
        return done(err, null);
      }
    }
  ));

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  app.use(passport.initialize());
  app.use(passport.session());

  // ── Make Discord client available to routes ────────────────────────────────
  app.set('discordClient', client);

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use('/api', require('./routes/api'));
  app.use('/auth', require('./routes/auth'));
  app.use('/admin', require('./routes/admin'));

  // ── Health Check ──────────────────────────────────────────────────────────
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      bot: client.isReady() ? 'online' : 'offline',
      maintenance: process.env.MAINTENANCE_MODE === 'true',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/', (req, res) => {
    res.json({ name: 'HowToERLC Bot API', website: 'https://howtoerlc.xyz', status: 'running' });
  });

  // ── 404 ───────────────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found.' });
  });

  // ── Error Handler ─────────────────────────────────────────────────────────
  app.use((err, req, res, next) => {
    console.error('[Server] Unhandled error:', err);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`[Server] Web API running on port ${port}`);
  });

  return app;
};
