const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot\'s latency and API response time.'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Checking...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('Latency')
      .addFields(
        { name: 'Bot', value: `${latency}ms`, inline: true },
        { name: 'API', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
      )
      .setFooter({ text: 'HowToERLC' });

    await interaction.editReply({ content: null, embeds: [embed] });
  },
};
