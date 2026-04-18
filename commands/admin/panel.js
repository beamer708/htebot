const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Post a server panel or dashboard to this channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o => o
      .setName('type')
      .setDescription('Which panel to post')
      .setRequired(true)
      .addChoices(
        { name: 'Main Dashboard', value: 'main'  },
        { name: 'Staff Dashboard', value: 'staff' },
      )),

  async execute(interaction, client) {
    const type = interaction.options.getString('type');
    await interaction.deferReply({ ephemeral: true });

    if (type === 'main') {
      const { sendMainDashboard } = require('./panels/mainDashboard');
      await sendMainDashboard(interaction);
      return interaction.editReply({ content: '✅ Main dashboard posted.' });
    }

    if (type === 'staff') {
      return interaction.editReply({ content: '⚠️ Staff dashboard is not yet configured.' });
    }
  },
};
