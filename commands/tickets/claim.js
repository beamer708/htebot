const { SlashCommandBuilder } = require('discord.js');
const { claimTicket } = require('../../utils/ticketUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('claim')
    .setDescription('Claim this support ticket as your own.'),

  async execute(interaction, client) {
    return claimTicket(interaction, client);
  },
};
