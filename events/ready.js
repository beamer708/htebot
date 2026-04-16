const { ActivityType } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`[Ready] Logged in as ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: 'howtoerlc.xyz', type: ActivityType.Watching }],
      status: 'online',
    });
  },
};
