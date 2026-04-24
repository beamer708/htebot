const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot\'s latency and API response time.'),

  async execute(interaction) {
    const { resource } = await interaction.reply({ content: 'Checking...', withResponse: true });
    const latency = resource.message.createdTimestamp - interaction.createdTimestamp;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('Latency')
      .addFields(
        { name: 'Bot', value: `${latency}ms`, inline: true },
        { name: 'API', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
      )

    await interaction.editReply({ content: null, embeds: [embed] });
  },
};
