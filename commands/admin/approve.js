const { SlashCommandBuilder } = require('discord.js');
const { approveApplication } = require('../../handlers/appHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('approve')
    .setDescription('Approve a staff application.')
    .addStringOption(opt =>
      opt.setName('id')
        .setDescription('Application ID to approve (e.g. APP-0001)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Optional note for the applicant')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    return approveApplication(
      interaction, client,
      interaction.options.getString('id'),
      interaction.options.getString('reason'),
    );
  },
};
