require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const config = require('./config.json');

// ── Startup validation — listing moderation requires both of these ───────────
{
  const SNOWFLAKE = /^\d{17,20}$/;
  const missing = [];
  if (!SNOWFLAKE.test(config.moderationForum   || '')) missing.push('moderationForum (forum channel ID for listing review)');
  if (!SNOWFLAKE.test(config.managementRoleId  || '')) missing.push('managementRoleId (role allowed to approve/deny listings)');
  if (missing.length) {
    console.error(
      '[Startup] Refusing to start — config.json is missing or has invalid values for:\n' +
      missing.map(m => `  • ${m}`).join('\n') +
      '\nSet these to valid Discord IDs in config.json and restart.'
    );
    process.exit(1);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildInvites,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

client.commands = new Collection();
client.cooldowns = new Collection();

require('./handlers/commandHandler')(client);
require('./handlers/eventHandler')(client);
require('./web/server')(client);

// Legacy push server — replaced by the listing poller (utils/listingPoller.js).
// Only starts when ENABLE_PUSH_SERVER=true; running both would double-post.
if (process.env.ENABLE_PUSH_SERVER === 'true') {
  client.once('ready', () => {
    const { startServer } = require('./server');
    startServer(client);
  });
}

client.login(process.env.BOT_TOKEN);
