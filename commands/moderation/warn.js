const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

const logsPath = path.join(__dirname, '..', '..', 'data', 'warnings.json');
function readLogs() { try { return JSON.parse(fs.readFileSync(logsPath, 'utf8')); } catch { return {}; } }
function writeLogs(data) { fs.writeFileSync(logsPath, JSON.stringify(data, null, 2)); }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a member.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the warning').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    const logs = readLogs();
    if (!logs[target.id]) logs[target.id] = [];

    const warnId = `WARN-${Date.now()}`;
    logs[target.id].push({ id: warnId, type: 'warn', reason, moderator: interaction.user.tag, timestamp: new Date().toISOString() });
    writeLogs(logs);

    const warnCount = logs[target.id].filter(e => e.type === 'warn').length;

    const dmEmbed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('⚠️ You have received a warning')
      .setDescription('You were warned in **HowToERLC**.')
      .addFields(
        { name: 'Reason', value: reason },
        { name: 'Warning ID', value: warnId },
        { name: 'Total Warnings', value: `${warnCount}` },
      )
      .setFooter({ text: 'HowToERLC • howtoerlc.xyz' })
      .setTimestamp();

    await target.send({ embeds: [dmEmbed] }).catch(() => {});

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('⚠️ Member Warned')
      .addFields(
        { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Warning #', value: `${warnCount}`, inline: true },
        { name: 'Reason', value: reason, inline: false },
      )
      .setTimestamp();

    const logChannel = interaction.guild.channels.cache.get(config.channels.logs);
    if (logChannel) await logChannel.send({ embeds: [embed] });

    await interaction.reply({ embeds: [embed] });
  },
};
