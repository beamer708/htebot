const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

const logsPath = path.join(__dirname, '..', '..', 'data', 'warnings.json');
function readLogs() { try { return JSON.parse(fs.readFileSync(logsPath, 'utf8')); } catch { return {}; } }
function writeLogs(data) { fs.writeFileSync(logsPath, JSON.stringify(data, null, 2)); }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName('user').setDescription('User to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the kick').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ content: '❌ You cannot kick yourself.', ephemeral: true });

    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('👢 You have been kicked')
        .setDescription('You were kicked from **HowToERLC**.')
        .addFields({ name: 'Reason', value: reason })
        .setFooter({ text: 'HowToERLC • howtoerlc.xyz' })
        .setTimestamp();

      await target.send({ embeds: [dmEmbed] }).catch(() => {});
      await target.kick(`${reason} | Kicked by ${interaction.user.tag}`);

      const logs = readLogs();
      if (!logs[target.id]) logs[target.id] = [];
      logs[target.id].push({ type: 'kick', reason, moderator: interaction.user.tag, timestamp: new Date().toISOString() });
      writeLogs(logs);

      const embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('👢 Member Kicked')
        .addFields(
          { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason, inline: false },
        )
        .setTimestamp();

      const logChannel = interaction.guild.channels.cache.get(config.channels.logs);
      if (logChannel) await logChannel.send({ embeds: [embed] });

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({ content: `❌ Failed to kick: ${err.message}`, ephemeral: true });
    }
  },
};
