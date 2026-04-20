const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Post a server panel or dashboard to this channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o =>
      o.setName('type')
        .setDescription('Which panel to post')
        .setRequired(true)
        .addChoices(
          { name: 'Main Dashboard', value: 'main' },
          { name: 'Staff Dashboard', value: 'staff' },
        )
    ),

  async execute(interaction) {
    const type = interaction.options.getString('type');
    await interaction.deferReply({ ephemeral: true });

    if (type === 'main') {
      const { sendMainDashboard } = require('./panels/mainDashboard');
      await sendMainDashboard(interaction);
      await interaction.editReply({ content: 'Main dashboard posted.' });
      return;
    }

    if (type === 'staff') {
      await interaction.editReply({ content: 'The staff dashboard has not been configured yet.' });
    }
  },
};
