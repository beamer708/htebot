const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

const invitesPath = path.join(__dirname, '..', 'data', 'invites.json');
function readInvites() { try { return JSON.parse(fs.readFileSync(invitesPath, 'utf8')); } catch { return {}; } }
function writeInvites(data) { fs.writeFileSync(invitesPath, JSON.stringify(data, null, 2)); }

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    const logChannel = member.guild.channels.cache.get(config.channels.logs);

    // ── Invite tracker — mark early departure ────────────────────
    const invites = readInvites();
    const entry = invites[member.id];
    if (entry && !entry.retained) {
      invites[member.id].leftAt = new Date().toISOString();
      writeInvites(invites);

      const joinedMs = new Date(entry.joinedAt).getTime();
      const elapsed  = Date.now() - joinedMs;
      const days     = Math.floor(elapsed / 86_400_000);
      const hours    = Math.floor((elapsed % 86_400_000) / 3_600_000);

      const inviteLeaveEmbed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('<:userminus:1507191545583894598> PR Invite — Member Left (Not Retained)')
        .addFields(
          { name: 'User',                value: `${member.user.tag} (${member.id})`,             inline: true },
          { name: 'Originally Invited By', value: `<@${entry.inviterId}>`,                       inline: true },
          { name: 'Time in Server',      value: `${days}d ${hours}h`,                            inline: true },
          { name: 'Invite Code',         value: `\`${entry.inviteCode || 'unknown'}\``,          inline: true },
          { name: 'Status',              value: '❌ Will NOT count toward payout',               inline: false },
        )
        .setTimestamp();

      // Log to pr-logs (primary), then inviteLogs fallback, then general logs
      const prLogChannel = member.guild.channels.cache.get(config.channels.prLogs);
      const inviteLogChannel = member.guild.channels.cache.get(config.channels.inviteLogs) || logChannel;
      if (prLogChannel) {
        await prLogChannel.send({ embeds: [inviteLeaveEmbed] }).catch(() => {});
      } else if (inviteLogChannel) {
        await inviteLogChannel.send({ embeds: [inviteLeaveEmbed] }).catch(() => {});
      }
    }

    // ── Standard member-left log ─────────────────────────────────
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle('<:userminus:1507191545583894598> Member Left')
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
        { name: 'Joined', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
        { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true },
      )
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  },
};
