const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { buildStickyPanel, hasManagementAccess, PANEL_FLAGS } = require('../../handlers/stickyHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sticky')
    .setDescription('Manage sticky messages: toggle each channel on or off.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!await hasManagementAccess(interaction)) {
      return interaction.reply({
        content: 'Only management can manage sticky messages.',
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      components: [buildStickyPanel()],
      flags: PANEL_FLAGS,
    });
  },
};
