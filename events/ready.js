const { ActivityType, Collection } = require('discord.js');
const { startRetentionChecker } = require('../utils/retentionChecker');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`[Ready] Logged in as ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: '🌐 howtoerlc.xyz', type: ActivityType.Watching }],
      status: 'online',
    });

    // Populate invite cache for every guild
    client.inviteCache = new Collection();
    for (const guild of client.guilds.cache.values()) {
      try {
        const invites = await guild.invites.fetch();
        client.inviteCache.set(
          guild.id,
          new Collection(invites.map(inv => [inv.code, inv.uses]))
        );
      } catch {
        // No MANAGE_GUILD permission in this guild — skip
      }
    }
    console.log('[Ready] Invite cache populated.');

    startRetentionChecker(client);
  },
};
