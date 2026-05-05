const { SlashCommandBuilder, EmbedBuilder , MessageFlags } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all available HowToERLC bot commands.'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('Command List')
      .setDescription('A full list of available commands for the HowToERLC bot.')
      .addFields(
        {
          name: 'Tickets',
          value: '`/claim` — Claim the current ticket\n`/close` — Close or request closure of the current ticket',
          inline: false,
        },
        {
          name: 'Moderation',
          value: '`/ban` — Ban a member\n`/kick` — Kick a member\n`/mute` — Timeout a member\n`/warn` — Warn a member\n`/logs` — View a member\'s mod history',
          inline: false,
        },
        {
          name: 'Admin',
          value: '`/announce` — Post an announcement\n`/resource` — Post a resource release\n`/panel` — Post a server dashboard\n`/maintenance` — Toggle maintenance mode\n`/invite-admin` — Manage invite tracking\n`/approve` — Approve a staff application\n`/deny` — Deny a staff application\n`/search` — Search applications or suggestions',
          inline: false,
        },
        {
          name: 'Utility',
          value: '`/suggest` — Submit a suggestion\n`/ping` — Check bot latency\n`/help` — Show this list',
          inline: false,
        },
      )

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
