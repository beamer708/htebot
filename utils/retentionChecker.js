const fs   = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const invitesPath = path.join(__dirname, '..', 'data', 'invites.json');
function readInvites()      { try { return JSON.parse(fs.readFileSync(invitesPath, 'utf8')); } catch { return {}; } }
function writeInvites(data) { fs.writeFileSync(invitesPath, JSON.stringify(data, null, 2)); }

// PR payout thresholds — single source of truth in config.prPayout
const PR_REQUIRED = config.prPayout?.requiredRetained ?? 5;
const PR_DAYS     = config.prPayout?.retentionDays ?? 14;
const PR_ROBUX    = config.prPayout?.rewardRobux ?? 50;

async function runRetentionCheck(client) {
  const invites = readInvites();
  let changed   = false;

  const guild      = client.guilds.cache.first();
  const prLogCh    = guild?.channels.cache.get(config.channels.prLogs);
  const fallbackCh = guild?.channels.cache.get(config.channels.inviteLogs)
    || guild?.channels.cache.get(config.channels.logs);

  for (const [userId, entry] of Object.entries(invites)) {
    if (entry.retained || entry.leftAt) continue;

    const joinedMs = new Date(entry.joinedAt).getTime();
    if (Date.now() - joinedMs < PR_DAYS * 24 * 60 * 60 * 1000) continue;

    invites[userId].retained           = true;
    invites[userId].retentionCheckedAt = new Date().toISOString();
    changed = true;

    // ── Log retention event to pr-logs ──────────────────────────────
    const retainedEmbed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle(`Invite Retained, ${PR_DAYS} Days`)
      .addFields(
        { name: 'User',       value: `<@${entry.invitedUserId}> (${entry.invitedUserId})`, inline: true },
        { name: 'Invited By', value: `<@${entry.inviterId}>`,                              inline: true },
        { name: 'Joined',     value: `<t:${Math.floor(joinedMs / 1000)}:R>`,               inline: true },
        { name: 'Status',     value: `Still in server after ${PR_DAYS} days`,              inline: false },
      )
      .setTimestamp();

    if (prLogCh)    await prLogCh.send({ embeds: [retainedEmbed] }).catch(() => {});
    else if (fallbackCh) await fallbackCh.send({ embeds: [retainedEmbed] }).catch(() => {});

    // ── Check payout milestone (every PR_REQUIRED retained by same inviter) ───
    const retainedCount = Object.values(invites).filter(
      e => e.inviterId === entry.inviterId && e.retained
    ).length;

    if (retainedCount > 0 && retainedCount % PR_REQUIRED === 0) {
      const milestoneEmbed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('Payout Milestone Reached')
        .setDescription(
          `<@${entry.inviterId}> has **${retainedCount} retained invites** and is eligible for a **${PR_ROBUX} Robux payout**.\n` +
          `-# They can click **Request Payout** on the PR Team panel to claim their reward.`
        )
        .addFields(
          { name: 'PR Member',      value: `<@${entry.inviterId}>`, inline: true },
          { name: 'Retained Total', value: `${retainedCount}`,      inline: true },
          { name: 'Payout Amount',  value: `${PR_ROBUX} Robux`,     inline: true },
        )
        .setFooter({ text: 'HowToERLC PR Team • Milestone auto-detected' })
        .setTimestamp();

      if (prLogCh) await prLogCh.send({ content: `<@&${config.roles.prManager}>`, embeds: [milestoneEmbed] }).catch(() => {});
      else if (fallbackCh) await fallbackCh.send({ embeds: [milestoneEmbed] }).catch(() => {});
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
