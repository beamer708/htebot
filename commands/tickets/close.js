const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the current support ticket.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction, client) {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const btn = new ButtonBuilder()
      .setCustomId('ticket:close')
      .setLabel('🔒 Confirm Close')
      .setStyle(ButtonStyle.Danger);

    await interaction.reply({
      content: 'Are you sure you want to close this ticket?',
      components: [new ActionRowBuilder().addComponents(btn)],
      ephemeral: false,
    });
  },
};
