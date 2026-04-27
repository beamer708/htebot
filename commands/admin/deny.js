const { SlashCommandBuilder } = require('discord.js');
const { denyApplication } = require('../../handlers/appHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deny')
    .setDescription('Deny a staff application.')
    .addStringOption(opt =>
      opt.setName('id')
        .setDescription('Application ID to deny (e.g. APP-0001)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for denial')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    return denyApplication(
      interaction, client,
      interaction.options.getString('id'),
      interaction.options.getString('reason'),
    );
  },
};
