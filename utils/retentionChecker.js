const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const invitesPath = path.join(__dirname, '..', 'data', 'invites.json');

function readInvites() {
  try { return JSON.parse(fs.readFileSync(invitesPath, 'utf8')); } catch { return {}; }
}
function writeInvites(data) { fs.writeFileSync(invitesPath, JSON.stringify(data, null, 2)); }

async function runRetentionCheck(client) {
  const invites = readInvites();
  let changed = false;

  for (const [userId, entry] of Object.entries(invites)) {
    if (entry.retained || entry.leftAt) continue;

    const joinedMs = new Date(entry.joinedAt).getTime();
    if (Date.now() - joinedMs < 30 * 24 * 60 * 60 * 1000) continue;

    invites[userId].retained = true;
    invites[userId].retentionCheckedAt = new Date().toISOString();
    changed = true;

    const guild = client.guilds.cache.first();
    const logChannel = guild?.channels.cache.get(config.channels.inviteLogs)
      || guild?.channels.cache.get(config.channels.logs);

    if (logChannel) {
      const retainedEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('📅 Invite Retained — 30 Days')
        .addFields(
          { name: 'User', value: `<@${entry.invitedUserId}> (${entry.invitedUserId})`, inline: true },
          { name: 'Invited By', value: `<@${entry.inviterId}>`, inline: true },
          { name: 'Joined', value: `<t:${Math.floor(joinedMs / 1000)}:R>`, inline: true },
          { name: 'Status', value: '✅ Still in server after 30 days', inline: false },
        )
        .setTimestamp();
      await logChannel.send({ embeds: [retainedEmbed] }).catch(() => {});

      const retainedCount = Object.values(invites).filter(
        e => e.inviterId === entry.inviterId && e.retained
      ).length;

      if (retainedCount > 0 && retainedCount % 10 === 0) {
        const milestoneEmbed = new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle('🏆 Invite Milestone Reached!')
          .setDescription(`<@${entry.inviterId}> has retained **${retainedCount} members** in the HowToERLC server!`)
          .setTimestamp();
        await logChannel.send({ embeds: [milestoneEmbed] }).catch(() => {});
      }
    }
  }

  if (changed) writeInvites(invites);
}

function startRetentionChecker(client) {
  runRetentionCheck(client).catch(console.error);
  setInterval(() => runRetentionCheck(client).catch(console.error), 60 * 60 * 1000);
  console.log('[RetentionChecker] Started.');
}

module.exports = { startRetentionChecker };
