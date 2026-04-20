const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

const logsPath = path.join(__dirname, '..', '..', 'data', 'warnings.json');
function readLogs() { try { return JSON.parse(fs.readFileSync(logsPath, 'utf8')); } catch { return {}; } }
function writeLogs(data) { fs.writeFileSync(logsPath, JSON.stringify(data, null, 2)); }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .addIntegerOption(o => o.setName('days').setDescription('Days of messages to delete (0–7)').setMinValue(0).setMaxValue(7).setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const days = interaction.options.getInteger('days') ?? 0;

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: 'You cannot ban yourself.', ephemeral: true });
    }

    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('You have been banned')
        .setDescription('You were banned from the **HowToERLC** Discord server.')
        .addFields({ name: 'Reason', value: reason })
        .setFooter({ text: 'HowToERLC — howtoerlc.xyz' })
        .setTimestamp();

      await target.send({ embeds: [dmEmbed] }).catch(() => {});
      await interaction.guild.bans.create(target.id, { reason: `${reason} | Banned by ${interaction.user.username}`, deleteMessageDays: days });

      const logs = readLogs();
      if (!logs[target.id]) logs[target.id] = [];
      logs[target.id].push({ type: 'ban', reason, moderator: interaction.user.username, timestamp: new Date().toISOString() });
      writeLogs(logs);

      const embed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('Member Banned')
        .addFields(
          { name: 'User', value: `${target.username} (${target.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.username, inline: true },
          { name: 'Reason', value: reason, inline: false },
        )
        .setFooter({ text: 'HowToERLC' })
        .setTimestamp();

      const logChannel = interaction.guild.channels.cache.get(config.channels.logs);
      if (logChannel) await logChannel.send({ embeds: [embed] });

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[ban] Error:', err);
      await interaction.reply({ content: 'Failed to ban this user. Make sure my role is above theirs.', ephemeral: true });
    }
  },
};
