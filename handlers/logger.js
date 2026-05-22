// handlers/logger.js
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

async function log(client, message) {
  try {
    const channel = await client.channels.fetch(config.channels.notifyLog).catch(() => null);
    if (!channel) return;
    const embed = new EmbedBuilder()
      .setDescription(message)
      .setColor(0x1f1f1f)
      .setTimestamp()
      .setFooter({ text: 'HowToERLC Bot' });
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('[Logger] Failed to log message:', err);
  }
}

module.exports = { log };
