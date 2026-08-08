const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { dashboardPayload, hasManagementAccess } = require('../../handlers/panelDashboard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Open the panel configuration dashboard: map panels to channels, deploy, and update.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!await hasManagementAccess(interaction)) {
      return interaction.reply({
        content: 'Only management can configure panels.',
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply(dashboardPayload());
  },
};
