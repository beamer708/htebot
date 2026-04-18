const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { closeTicket } = require('../../utils/ticketUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the current support ticket.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction, client) {
    return closeTicket(interaction, client);
  },
};
