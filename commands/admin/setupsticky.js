const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { resendSticky } = require('../../events/messageCreate');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupsticky')
    .setDescription('Send or reset sticky messages in all advertising channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    let sent = 0;
    let failed = 0;

    for (const channelId of config.advertisingChannels) {
      const channel = interaction.client.channels.cache.get(channelId);
      if (!channel) { failed++; continue; }
      try {
        await resendSticky(channel);
        sent++;
      } catch {
        failed++;
      }
    }

    await interaction.editReply(
      `Sticky messages sent to **${sent}** channel(s)${failed ? `, failed for **${failed}**` : ''}.`
    );
  },
};
