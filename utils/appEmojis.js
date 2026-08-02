// utils/appEmojis.js — resolves the bot's uploaded application emojis by name.
// Load order: application emoji (fetched at startup) → known guild emoji →
// unicode fallback. Panels reference names only, so uploading a new
// application emoji with a matching name upgrades the visuals automatically.

// Known guild emojis already used across the bot (name → id). These render as
// long as the bot is in the HowToERLC guild.
const GUILD_EMOJIS = {
  HTELogo:       '1528564337101504655',
  howtoglogo:    '1494830728113033327',
  shieldcheck:   '1507191534003552277',
  Megaphone:     '1507191527099596800',
  Headset:       '1507191521407926322',
  Link:          '1507191523094167573',
  Coin:          '1507191513418039388',
  Target:        '1507191539892224211',
  chartbar:      '1507191493603885256',
  Book:          '1507191489174700203',
  Bell:          '1507191488667320390',
  infocircle:    '1507191522024755342',
  clipboardlist: '1507191509563473962',
  usercheck:     '1507191543952310404',
  userplus:      '1507191546813091841',
  circlecheck:   '1507191508066107532',
  circlex:       '1507191508657508503',
  squaredot:     '1507191535693860974',
  clockhour4:    '1507191510792142868',
  Select:        '1507191532875153519',
  pencil:        '1507191529062797312',
  alerttriangle: '1507191481906106398',
  crown:         '1507191516274360492',
  FileText:      '1507191520636436510',
  Confetti:      '1507191514042994748',
};

// name → { id, animated } for the application's uploaded emojis
const appEmojis = new Map();
let loaded = false;

/** Fetch the application's emoji list once at startup. Safe to call again. */
async function loadApplicationEmojis(client) {
  try {
    const list = await client.application.emojis.fetch();
    appEmojis.clear();
    for (const emoji of list.values()) {
      appEmojis.set(emoji.name, { id: emoji.id, animated: !!emoji.animated });
    }
    loaded = true;
    console.log(`[AppEmojis] Loaded ${appEmojis.size} application emoji(s).`);
  } catch (err) {
    console.warn(`[AppEmojis] Could not load application emojis (${err.message}). Falling back to guild emojis / unicode.`);
  }
}

/**
 * Resolve an emoji to its message-string form: "<:name:id>" or the unicode
 * fallback. Never throws.
 */
function e(name, fallback = '') {
  const app = appEmojis.get(name);
  if (app) return `<${app.animated ? 'a' : ''}:${name}:${app.id}>`;
  const guildId = GUILD_EMOJIS[name];
  if (guildId) return `<:${name}:${guildId}>`;
  return fallback;
}

/**
 * Resolve an emoji to the object form used by select options and buttons:
 * { id, name } for custom emojis, { name: unicode } for fallbacks.
 * Returns undefined when there is neither a custom emoji nor a fallback.
 */
function emojiObject(name, fallback = '') {
  const app = appEmojis.get(name);
  if (app) return { id: app.id, name, animated: app.animated };
  const guildId = GUILD_EMOJIS[name];
  if (guildId) return { id: guildId, name };
  return fallback ? { name: fallback } : undefined;
}

function isLoaded() { return loaded; }

module.exports = { loadApplicationEmojis, e, emojiObject, isLoaded, GUILD_EMOJIS };
