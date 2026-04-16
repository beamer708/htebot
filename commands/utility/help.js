const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all available HowToERLC bot commands.'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('📖 HowToERLC Bot — Command List')
      .setDescription('Everything you need to manage and engage with the HowToERLC community.')
      .addFields(
        {
          name: '🎫 Tickets',
          value: '`/ticket-setup` — Post the ticket creation panel\n`/close` — Close the current ticket channel',
          inline: false,
        },
        {
          name: '🔨 Moderation',
          value: '`/ban` — Ban a member\n`/kick` — Kick a member\n`/mute` — Timeout a member\n`/warn` — Warn a member\n`/logs` — View a member\'s mod history',
          inline: false,
        },
        {
          name: '📢 Admin',
          value: '`/announce` — Post a server announcement\n`/resource` — Post a resource release\n`/role-panel` — Create a role selection panel\n`/maintenance` — Toggle maintenance mode',
          inline: false,
        },
        {
          name: '🛠️ Utility',
          value: '`/ping` — Check bot latency\n`/help` — Show this list',
          inline: false,
        },
        {
          name: '🌐 Web Forms',
          value: 'Staff applications, suggestions, and partnership requests are submitted through the website at [howtoerlc.xyz](https://howtoerlc.xyz) and post automatically to this server.',
          inline: false,
        },
      )
      .setFooter({ text: 'HowToERLC Bot • howtoerlc.xyz' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
