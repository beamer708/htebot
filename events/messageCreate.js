const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

const stickyPath = path.join(__dirname, '..', 'data', 'stickyMessages.json');

function readSticky() {
  try { return JSON.parse(fs.readFileSync(stickyPath, 'utf8')); } catch { return {}; }
}
function writeSticky(data) {
  fs.writeFileSync(stickyPath, JSON.stringify(data, null, 2));
}

function buildStickyEmbed() {
  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('Advertising Guidelines')
    .setDescription(
      'Read the rules below before posting your advertisement.\n​'
    )
    .addFields(
      {
        name: '1. ERLC-related servers only',
        value: 'Advertisements must be for ERLC or Roblox emergency services communities.',
        inline: false,
      },
      {
        name: '2. Valid invite link required',
        value: 'Expired or broken invite links will result in an **automatic warning**. Ensure your link is valid before posting.',
        inline: false,
      },
      {
        name: '3. No duplicate posts',
        value: 'Allow at least **24 hours** between advertisements in the same channel.',
        inline: false,
      },
      {
        name: '4. No staff recruiting',
        value: 'Soliciting members away from this server is strictly prohibited.',
        inline: false,
      },
      {
        name: '5. One ad per message',
        value: 'Keep your advertisement to a single, well-formatted message.',
        inline: false,
      },
    )
    .setThumbnail(config.branding.thumbnail)
    .setTimestamp();
}

async function resendSticky(channel) {
  const stickies = readSticky();
  const oldId = stickies[channel.id];

  if (oldId) {
    const old = await channel.messages.fetch(oldId).catch(() => null);
    if (old) await old.delete().catch(() => {});
  }

  const msg = await channel.send({ embeds: [buildStickyEmbed()] });
  stickies[channel.id] = msg.id;
  writeSticky(stickies);
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    if (message.system) return;
    if (!message.guild) return;
    if (!config.advertisingChannels.includes(message.channel.id)) return;

    await resendSticky(message.channel);
  },
};

module.exports.resendSticky = resendSticky;
module.exports.buildStickyEmbed = buildStickyEmbed;
