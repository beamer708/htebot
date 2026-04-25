const { SlashCommandBuilder } = require('discord.js');
const { closeTicket, requestCloseTicket } = require('../../utils/ticketUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close or request closure of the current support ticket.')
    .addBooleanOption(opt =>
      opt.setName('request_close')
        .setDescription('True = submit a close request for staff to approve. False = close the ticket immediately.')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for closing this ticket.')
        .setRequired(true)
        .setMaxLength(500)
    ),

  async execute(interaction, client) {
    const requestClose = interaction.options.getBoolean('request_close');
    const reason = interaction.options.getString('reason');

    if (requestClose) {
      return requestCloseTicket(interaction, reason);
    } else {
      return closeTicket(interaction, client, reason);
    }
  },
};
