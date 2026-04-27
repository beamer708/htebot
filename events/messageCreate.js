const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, resolveColor,
} = require('discord.js');
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

function buildStickyMessage() {
  const container = new ContainerBuilder()
    .setAccentColor(resolveColor(config.colors.primary))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '## <:howtoglogo:1494830728113033327> Advertising Guidelines\n' +
        'Post your ERLC community below. Read the rules before advertising.'
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '<:Check:1494830681484824616> **ERLC-related only**\n' +
        'Advertisements must be for ERLC or Roblox emergency services communities.\n\n' +
        '<:Check:1494830681484824616> **Valid invite link required**\n' +
        'Ensure your link is active before posting. Expired or broken links result in an automatic **warning**.\n\n' +
        '<:Dot:1496643767585865818> **24 hour cooldown**\n' +
        'Wait at least 24 hours between posts in the same channel.\n\n' +
        '<:Cancel:1494830662581092482> **No staff recruiting**\n' +
        'Soliciting members away from this server is not allowed.\n\n' +
        '<:Cancel:1494830662581092482> **One post per channel**\n' +
        'Do not post the same advertisement across multiple channels at once.'
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('howtoerlc.xyz')
          .setStyle(ButtonStyle.Link)
          .setURL('https://howtoerlc.xyz')
      )
    );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

async function resendSticky(channel) {
  const stickies = readSticky();
  const oldId = stickies[channel.id];

  if (oldId) {
    const old = await channel.messages.fetch(oldId).catch(() => null);
    if (old) await old.delete().catch(() => {});
  }

  const msg = await channel.send(buildStickyMessage());
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
