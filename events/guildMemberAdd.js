const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, UserFlags, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

const invitesPath = path.join(__dirname, '..', 'data', 'invites.json');
function readInvites() { try { return JSON.parse(fs.readFileSync(invitesPath, 'utf8')); } catch { return {}; } }
function writeInvites(data) { fs.writeFileSync(invitesPath, JSON.stringify(data, null, 2)); }

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    // ── Welcome message ──────────────────────────────────────────
    const welcomeChannel = member.guild.channels.cache.get(config.channels.welcome);
    if (welcomeChannel) {
      const countBtn = new ButtonBuilder()
        .setCustomId('welcome_count')
        .setLabel(`${member.guild.memberCount}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

      const websiteBtn = new ButtonBuilder()
        .setLabel('Website')
        .setStyle(ButtonStyle.Link)
        .setURL('https://howtoerlc.xyz');

      await welcomeChannel.send({
        content: `<:howtoglogo:1494830728113033327> Welcome <@${member.id}> to **HowToERLC**`,
        components: [new ActionRowBuilder().addComponents(countBtn, websiteBtn)],
      });
    }

    // ── Invite tracking — diff cached vs. fresh ──────────────────
    let inviteCode = null;
    let inviter = null;

    try {
      const cachedUses = client.inviteCache.get(member.guild.id) || new Collection();
      const freshInvites = await member.guild.invites.fetch();

      const usedInvite = freshInvites.find(inv => {
        const before = cachedUses.get(inv.code);
        return before !== undefined && inv.uses > before;
      });

      client.inviteCache.set(
        member.guild.id,
        new Collection(freshInvites.map(inv => [inv.code, inv.uses]))
      );

      if (usedInvite) {
        inviteCode = usedInvite.code;
        inviter = usedInvite.inviter;
      }
    } catch {
      // Missing MANAGE_GUILD or fetch failed — skip tracking
    }

    if (inviter) {
      const invites = readInvites();
      invites[member.id] = {
        invitedUserId: member.id,
        invitedUsername: member.user.tag,
        inviterId: inviter.id,
        inviterUsername: inviter.tag,
        inviteCode,
        joinedAt: new Date().toISOString(),
        retained: false,
        retentionCheckedAt: null,
        leftAt: null,
      };
      writeInvites(invites);
    }

    // ── Advanced join log ────────────────────────────────────────
    const logChannel = member.guild.channels.cache.get(config.channels.logs);
    if (!logChannel) return;

    const accountCreatedTs = Math.floor(member.user.createdTimestamp / 1000);
    const joinedTs = Math.floor(member.joinedTimestamp / 1000);
    const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86_400_000);
    const isNewAccount = accountAgeDays < 7;
    const ageText = isNewAccount
      ? `${accountAgeDays} days old — NEW ACCOUNT`
      : `${accountAgeDays} days old`;

    const userFlags = await member.user.fetchFlags();
    const flagLabels = [];
    if (userFlags.has(UserFlags.Staff))                 flagLabels.push('Discord Employee');
    if (userFlags.has(UserFlags.Partner))               flagLabels.push('Discord Partner');
    if (userFlags.has(UserFlags.Hypesquad))             flagLabels.push('HypeSquad Events');
    if (userFlags.has(UserFlags.BugHunterLevel1))       flagLabels.push('Bug Hunter Level 1');
    if (userFlags.has(UserFlags.HypeSquadOnlineHouse1)) flagLabels.push('HypeSquad Bravery');
    if (userFlags.has(UserFlags.HypeSquadOnlineHouse2)) flagLabels.push('HypeSquad Brilliance');
    if (userFlags.has(UserFlags.HypeSquadOnlineHouse3)) flagLabels.push('HypeSquad Balance');
    if (userFlags.has(UserFlags.PremiumEarlySupporter)) flagLabels.push('Early Supporter');
    if (userFlags.has(UserFlags.BugHunterLevel2))       flagLabels.push('Bug Hunter Level 2');
    if (userFlags.has(UserFlags.VerifiedDeveloper))     flagLabels.push('Verified Bot Developer');
    if (userFlags.has(UserFlags.BotHTTPInteractions))   flagLabels.push('Bot HTTP Interactions');
    if (userFlags.has(UserFlags.ActiveDeveloper))       flagLabels.push('Active Developer');

    const flagsText = flagLabels.length > 0 ? flagLabels.join('\n') : 'None';

    let logColor = config.colors.primary;
    if (isNewAccount) logColor = config.colors.error;
    else if (flagLabels.length > 0) logColor = config.colors.flagAlert;

    const displayNameDifferent = member.displayName !== member.user.username;

    const logFields = [
      { name: 'Username', value: member.user.username, inline: true },
      { name: 'User ID', value: `\`${member.user.id}\``, inline: true },
      { name: 'Account Created', value: `<t:${accountCreatedTs}:R>`, inline: true },
      { name: 'Joined Server', value: `<t:${joinedTs}:R>`, inline: true },
      { name: 'Member Number', value: `#${member.guild.memberCount}`, inline: true },
      { name: 'Account Age', value: ageText, inline: false },
      { name: 'User Flags', value: flagsText, inline: false },
    ];
    if (displayNameDifferent) {
      logFields.splice(1, 0, { name: 'Display Name', value: member.displayName, inline: true });
    }

    if (inviter) {
      const retentionTs = Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000);
      logFields.push(
        { name: 'Invited By', value: `<@${inviter.id}> (\`${inviteCode}\`)`, inline: true },
        { name: 'Retention Check', value: `Scheduled for <t:${retentionTs}:F>`, inline: true },
      );
    }

    const logEmbed = new EmbedBuilder()
      .setColor(logColor)
      .setTitle('Member Joined')
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(logFields)
      .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] });
  },
};
