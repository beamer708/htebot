const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

const logsPath = path.join(__dirname, '..', '..', 'data', 'warnings.json');
function readLogs() { try { return JSON.parse(fs.readFileSync(logsPath, 'utf8')); } catch { return {}; } }

const TYPE_ICONS = { warn: '⚠️', mute: '🔇', kick: '👢', ban: '🔨' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('View moderation history for a member.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('User to look up').setRequired(true))
    .addStringOption(o => o.setName('filter').setDescription('Filter by type').setRequired(false)
      .addChoices(
        { name: 'All', value: 'all' },
        { name: 'Warnings', value: 'warn' },
        { name: 'Mutes', value: 'mute' },
        { name: 'Kicks', value: 'kick' },
        { name: 'Bans', value: 'ban' },
      )),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const filter = interaction.options.getString('filter') || 'all';

    const logs = readLogs();
    let entries = logs[target.id] || [];

    if (filter !== 'all') entries = entries.filter(e => e.type === filter);

    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle(`📋 Mod Logs — ${target.tag}`)
      .setThumbnail(target.displayAvatarURL())
      .setFooter({ text: `HowToERLC Moderation • ${entries.length} record(s)` })
      .setTimestamp();

    if (entries.length === 0) {
      embed.setDescription('No moderation records found.');
    } else {
      const recent = entries.slice(-10).reverse();
      const lines = recent.map(e => {
        const icon = TYPE_ICONS[e.type] || '❓';
        const date = new Date(e.timestamp).toLocaleDateString();
        return `${icon} **${e.type.toUpperCase()}** — ${e.reason}\n> by ${e.moderator} on ${date}`;
      });
      embed.setDescription(lines.join('\n\n'));
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
