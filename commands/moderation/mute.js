const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

const logsPath = path.join(__dirname, '..', '..', 'data', 'warnings.json');
function readLogs() { try { return JSON.parse(fs.readFileSync(logsPath, 'utf8')); } catch { return {}; } }
function writeLogs(data) { fs.writeFileSync(logsPath, JSON.stringify(data, null, 2)); }

const DURATION_MAP = {
  '60s': 60_000,
  '5m': 300_000,
  '10m': 600_000,
  '30m': 1_800_000,
  '1h': 3_600_000,
  '6h': 21_600_000,
  '12h': 43_200_000,
  '1d': 86_400_000,
  '7d': 604_800_000,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout (mute) a member.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('User to mute').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('Duration').setRequired(true)
      .addChoices(
        { name: '1 minute', value: '60s' },
        { name: '5 minutes', value: '5m' },
        { name: '10 minutes', value: '10m' },
        { name: '30 minutes', value: '30m' },
        { name: '1 hour', value: '1h' },
        { name: '6 hours', value: '6h' },
        { name: '12 hours', value: '12h' },
        { name: '1 day', value: '1d' },
        { name: '7 days', value: '7d' },
      ))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const durationKey = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const ms = DURATION_MAP[durationKey];

    if (!target) return interaction.reply({ content: 'Member not found.', ephemeral: true });

    try {
      await target.timeout(ms, `${reason} | Muted by ${interaction.user.username}`);

      const logs = readLogs();
      if (!logs[target.id]) logs[target.id] = [];
      logs[target.id].push({ type: 'mute', reason, duration: durationKey, moderator: interaction.user.username, timestamp: new Date().toISOString() });
      writeLogs(logs);

      const embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('Member Muted')
        .addFields(
          { name: 'User', value: `${target.user.username} (${target.id})`, inline: true },
          { name: 'Duration', value: durationKey, inline: true },
          { name: 'Moderator', value: interaction.user.username, inline: true },
          { name: 'Reason', value: reason, inline: false },
        )
        .setFooter({ text: 'HowToERLC' })
        .setTimestamp();

      const logChannel = interaction.guild.channels.cache.get(config.channels.logs);
      if (logChannel) await logChannel.send({ embeds: [embed] });

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[mute] Error:', err);
      await interaction.reply({ content: 'Failed to mute this user.', ephemeral: true });
    }
  },
};
