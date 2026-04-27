const {
  EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder,
  PermissionFlagsBits, MessageFlags,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const {
  getNextTicketNumber, formatTicketId,
  getOpenTicketByChannel, getOpenTicketByUser, createTicket,
  fetchAllMessages, buildTranscript, postTranscript,
  closeTicket, requestCloseTicket, approveCloseRequest, denyCloseRequest, claimTicket,
} = require('../utils/ticketUtils');

const dataPath = (file) => path.join(__dirname, '..', 'data', file);

function readJSON(file)        { try { return JSON.parse(fs.readFileSync(dataPath(file), 'utf8')); } catch { return []; } }
function writeJSON(file, data) { fs.writeFileSync(dataPath(file), JSON.stringify(data, null, 2)); }

const invitesPath = dataPath('invites.json');
function readInvites() { try { return JSON.parse(fs.readFileSync(invitesPath, 'utf8')); } catch { return {}; } }
function writeInvites(d) { fs.writeFileSync(invitesPath, JSON.stringify(d, null, 2)); }

async function dmUser(client, userId, embed) {
  try {
    const user = await client.users.fetch(userId);
    await user.send({ embeds: [embed] });
  } catch {
    // User has DMs disabled
  }
}

// ── Application buttons (Accept / Deny) ───────────────────────────────────────
async function handleApplicationButton(interaction, client) {
  const [, action, submissionId] = interaction.customId.split(':');
  const applications = readJSON('applications.json');
  const idx = applications.findIndex(a => a.id === submissionId);
  if (idx === -1) return interaction.reply({ content: '<:Cancel:1494830662581092482> Application not found.', flags: MessageFlags.Ephemeral });

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const isStaff = member && (
    member.roles.cache.has(config.roles.staff) ||
    member.roles.cache.has(config.roles.admin) ||
    member.permissions.has('ManageGuild')
  );
  if (!isStaff) return interaction.reply({ content: '<:Cancel:1494830662581092482> Only staff can review applications.', flags: MessageFlags.Ephemeral });

  const app = applications[idx];
  const accepted = action === 'accept';
  const staffName = interaction.user.username;

  applications[idx].status     = accepted ? 'accepted' : 'denied';
  applications[idx].reviewedBy = staffName;
  applications[idx].reviewedAt = new Date().toISOString();
  writeJSON('applications.json', applications);

  const resultEmbed = new EmbedBuilder()
    .setColor(accepted ? config.colors.success : config.colors.error)
    .setTitle(accepted ? 'Application Accepted' : 'Application Denied')
    .setDescription(accepted
      ? 'Your staff application for **HowToERLC** has been accepted. A staff member will be in touch with further steps.'
      : 'Your staff application for **HowToERLC** has been denied. You are welcome to re-apply in the future.')
    .addFields({ name: 'Role Applied For', value: app.roleApplying || 'Unknown' })
    .setTimestamp();

  await dmUser(client, app.discordId, resultEmbed);

  const reviewedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(accepted ? config.colors.success : config.colors.error)

  await interaction.update({ embeds: [reviewedEmbed], components: [] });
}

// ── Suggestion buttons (Upvote / Downvote / Approve / Decline) ───────────────
async function handleSuggestionButton(interaction, client) {
  const [, action, submissionId] = interaction.customId.split(':');
  const suggestions = readJSON('suggestions.json');
  const idx = suggestions.findIndex(s => s.id === submissionId);
  if (idx === -1) return interaction.reply({ content: '<:Cancel:1494830662581092482> Suggestion not found.', flags: MessageFlags.Ephemeral });

  const suggestion = suggestions[idx];

  if (action === 'upvote' || action === 'downvote') {
    const userId = interaction.user.id;
    if (!suggestions[idx].votes) suggestions[idx].votes = { up: [], down: [] };

    const upIdx   = suggestions[idx].votes.up.indexOf(userId);
    const downIdx = suggestions[idx].votes.down.indexOf(userId);

    if (action === 'upvote') {
      if (upIdx !== -1) {
        suggestions[idx].votes.up.splice(upIdx, 1);
      } else {
        suggestions[idx].votes.up.push(userId);
        if (downIdx !== -1) suggestions[idx].votes.down.splice(downIdx, 1);
      }
    } else {
      if (downIdx !== -1) {
        suggestions[idx].votes.down.splice(downIdx, 1);
      } else {
        suggestions[idx].votes.down.push(userId);
        if (upIdx !== -1) suggestions[idx].votes.up.splice(upIdx, 1);
      }
    }

    writeJSON('suggestions.json', suggestions);
    const up   = suggestions[idx].votes.up.length;
    const down = suggestions[idx].votes.down.length;

    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
    const fields = updatedEmbed.data.fields || [];
    const voteFieldIdx = fields.findIndex(f => f.name === 'Votes');
    if (voteFieldIdx !== -1) {
      fields[voteFieldIdx].value = `${up} up  •  ${down} down`;
    } else {
      fields.push({ name: 'Votes', value: `${up} up  •  ${down} down`, inline: false });
    }

    return interaction.update({ embeds: [updatedEmbed] });
  }

  // Approve / decline (staff only)
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const isStaff = member && (
    member.roles.cache.has(config.roles.staff) ||
    member.roles.cache.has(config.roles.admin) ||
    member.permissions.has('ManageGuild')
  );
  if (!isStaff) return interaction.reply({ content: '<:Cancel:1494830662581092482> Only staff can approve or decline suggestions.', flags: MessageFlags.Ephemeral });

  const accepted = action === 'approve';
  const staffName = interaction.user.username;
  suggestions[idx].status     = accepted ? 'approved' : 'declined';
  suggestions[idx].reviewedBy = staffName;
  suggestions[idx].reviewedAt = new Date().toISOString();
  writeJSON('suggestions.json', suggestions);

  const resultEmbed = new EmbedBuilder()
    .setColor(accepted ? config.colors.success : config.colors.error)
    .setTitle(accepted ? 'Suggestion Approved' : 'Suggestion Declined')
    .setDescription(accepted
      ? `Your suggestion **"${suggestion.title}"** has been approved by the HowToERLC staff team.`
      : `Your suggestion **"${suggestion.title}"** has been declined by the HowToERLC staff team.`)
    .setTimestamp();

  await dmUser(client, suggestion.discordId, resultEmbed);

  const reviewedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(accepted ? config.colors.success : config.colors.error)

  await interaction.update({ embeds: [reviewedEmbed], components: [] });
}

// ── Partnership buttons (Approve / Deny) ──────────────────────────────────────
async function handlePartnershipButton(interaction, client) {
  const [, action, submissionId] = interaction.customId.split(':');
  const partnerships = readJSON('partnerships.json');
  const idx = partnerships.findIndex(p => p.id === submissionId);
  if (idx === -1) return interaction.reply({ content: '<:Cancel:1494830662581092482> Partnership not found.', flags: MessageFlags.Ephemeral });

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const isStaff = member && (
    member.roles.cache.has(config.roles.staff) ||
    member.roles.cache.has(config.roles.admin) ||
    member.permissions.has('ManageGuild')
  );
  if (!isStaff) return interaction.reply({ content: '<:Cancel:1494830662581092482> Only staff can review partnership requests.', flags: MessageFlags.Ephemeral });

  const partnership = partnerships[idx];
  const accepted = action === 'approve';
  const staffName = interaction.user.username;
  partnerships[idx].status     = accepted ? 'approved' : 'denied';
  partnerships[idx].reviewedBy = staffName;
  partnerships[idx].reviewedAt = new Date().toISOString();
  writeJSON('partnerships.json', partnerships);

  const resultEmbed = new EmbedBuilder()
    .setColor(accepted ? config.colors.success : config.colors.error)
    .setTitle(accepted ? 'Partnership Approved' : 'Partnership Denied')
    .setDescription(accepted
      ? `Your partnership request for **${partnership.serverName}** has been approved by HowToERLC. A staff member will reach out with next steps.`
      : `Your partnership request for **${partnership.serverName}** has been denied by HowToERLC.`)
    .setTimestamp();

  if (partnership.contactId) await dmUser(client, partnership.contactId, resultEmbed);

  const reviewedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(accepted ? config.colors.success : config.colors.error)

  await interaction.update({ embeds: [reviewedEmbed], components: [] });
}

// ── Ticket buttons (Create / Close / Claim / Transcript) ─────────────────────
async function handleTicketButton(interaction, client) {
  const [, action] = interaction.customId.split(':');

  if (action === 'create') {
    const modal = new ModalBuilder()
      .setCustomId('ticket_modal')
      .setTitle('Open a Support Ticket');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('ticket_subject')
          .setLabel('Subject')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Brief summary of your issue')
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('ticket_description')
          .setLabel('Description')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Describe your issue in as much detail as possible')
          .setRequired(true)
          .setMaxLength(1000)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('ticket_priority')
          .setLabel('Priority')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Low / Medium / High')
          .setRequired(false)
          .setMaxLength(10)
      ),
    );
    return interaction.showModal(modal);
  }

  if (action === 'close')         return closeTicket(interaction, client);
  if (action === 'claim')         return claimTicket(interaction, client);
  if (action === 'transcript')    return handleTicketTranscript(interaction, client);
  if (action === 'approve_close') return approveCloseRequest(interaction, client);
  if (action === 'deny_close')    return denyCloseRequest(interaction);
}

async function handleTicketTranscript(interaction, client) {
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const isStaff = member && (
    member.roles.cache.has(config.roles.staff) ||
    member.roles.cache.has(config.roles.admin) ||
    member.permissions.has('ManageChannels')
  );
  if (!isStaff) {
    return interaction.reply({ content: '<:Cancel:1494830662581092482> Only staff can generate transcripts.', flags: MessageFlags.Ephemeral });
  }

  const ticket = getOpenTicketByChannel(interaction.channel.id);
  if (!ticket) {
    return interaction.reply({ content: 'No ticket found for this channel.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const messages = await fetchAllMessages(interaction.channel).catch(() => []);
  const transcriptText = buildTranscript(ticket, messages);
  const attachment = new AttachmentBuilder(Buffer.from(transcriptText), { name: `${ticket.id}.txt` });

  await interaction.editReply({
    content: `Transcript for **${ticket.id}** (${messages.length} messages):`,
    files: [attachment],
  });

  const closedBy = ticket.closedBy || interaction.user.tag;
  await postTranscript(interaction.guild, ticket, messages, closedBy);
}

// ── Ticket modal submit ───────────────────────────────────────────────────────
async function handleTicketModal(interaction, client) {
  const subject     = interaction.fields.getTextInputValue('ticket_subject');
  const description = interaction.fields.getTextInputValue('ticket_description');
  const priorityRaw = interaction.fields.getTextInputValue('ticket_priority').trim();
  const priority    = ['low', 'medium', 'high'].includes(priorityRaw.toLowerCase())
    ? priorityRaw.charAt(0).toUpperCase() + priorityRaw.slice(1).toLowerCase()
    : 'Medium';

  const guild = interaction.guild;
  const user  = interaction.user;

  const existing = getOpenTicketByUser(user.id);
  if (existing) {
    return interaction.reply({
      content: `You already have an open ticket: <#${existing.channelId}>`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const ticketNum = getNextTicketNumber();
  const ticketId  = formatTicketId(ticketNum);

  const channel = await guild.channels.create({
    name: ticketId,
    parent: config.categories.tickets || null,
    permissionOverwrites: [
      { id: guild.id,           deny:  [PermissionFlagsBits.ViewChannel] },
      { id: user.id,            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.AttachFiles,  PermissionFlagsBits.ReadMessageHistory] },
      { id: config.roles.staff, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.AttachFiles,  PermissionFlagsBits.ReadMessageHistory,
                                        PermissionFlagsBits.ManageMessages] },
    ],
  });

  const now = new Date().toISOString();
  createTicket({
    id: ticketId, number: ticketNum, channelId: channel.id,
    userId: user.id, username: user.tag,
    subject, description, priority, openedAt: now,
  });

  const ticketEmbed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`<:On:1498148402180001942> Ticket #${String(ticketNum).padStart(4, '0')} — ${subject}`)
    .setDescription(description)
    .addFields(
      { name: 'Opened By', value: `<@${user.id}> (${user.id})`,                             inline: true },
      { name: 'Priority',  value: priority,                                                   inline: true },
      { name: 'Opened At', value: `<t:${Math.floor(new Date(now).getTime() / 1000)}:F>`,     inline: true },
      { name: 'Ticket ID', value: ticketId,                                                   inline: true },
    )
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:close').setLabel('Close Ticket').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket:claim').setLabel('Claim Ticket').setStyle(ButtonStyle.Primary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary),
  );

  await channel.send({
    content: `<@${user.id}> <@&${config.roles.staff}> — New ticket opened`,
    embeds: [ticketEmbed],
    components: [row1, row2],
  });

  await interaction.reply({ content: `<:Check:1494830681484824616> Your ticket has been created: ${channel}`, flags: MessageFlags.Ephemeral });
}

// ── Role panel buttons ────────────────────────────────────────────────────────
async function handleRolePanelButton(interaction) {
  const [, roleId] = interaction.customId.split(':');
  const member = interaction.member;

  if (member.roles.cache.has(roleId)) {
    await member.roles.remove(roleId);
    return interaction.reply({ content: `Removed role <@&${roleId}>.`, flags: MessageFlags.Ephemeral });
  } else {
    await member.roles.add(roleId);
    return interaction.reply({ content: `Added role <@&${roleId}>.`, flags: MessageFlags.Ephemeral });
  }
}

// ── Dashboard info select menu ────────────────────────────────────────────────
const INFO_EMBEDS = {
  info_about: {
    title: '<:howtoglogo:1494830728113033327> About HowToERLC',
    description: 'HowToERLC is the leading resource hub for ERLC community owners and builders on Roblox. We provide free guides, templates, department structures, livery resources, and direct community support to help you build and run a successful ERLC server.\n\n<:RightArrow:1498148469284667562> Visit **howtoerlc.xyz** to submit staff applications, share suggestions, request partnerships, and access an AI assistant built specifically for ERLC.',
  },
  info_guidelines: {
    title: '<:Dot:1496643767585865818> Server Guidelines',
    description: 'By being in this server you agree to follow these rules and Discord\'s Terms of Service.\n\n<:Check:1494830681484824616> **Be respectful.** Treat all members and staff with respect. Harassment, hate speech, and discrimination are not tolerated.\n\n<:Check:1494830681484824616> **Keep it relevant.** All content must relate to ERLC community building. Off-topic discussions belong in designated channels.\n\n<:Cancel:1494830662581092482> **No spam or self-promotion.** Unsolicited promotion and spam are not permitted outside of designated channels.\n\n<:Check:1494830681484824616> **Follow Roblox & Discord ToS.** All Roblox and Discord Terms of Service apply at all times.\n\n<:Dot:1496643767585865818> **Staff decisions are final.** Repeated violations will result in removal from the server.',
  },
  info_advertising: {
    title: '<:Dot:1496643767585865818> Advertising Guidelines',
    description: 'Advertisements are permitted in the designated channel only and must follow these rules.\n\n<:Check:1494830681484824616> **ERLC-related only.** Ads must be directly related to ERLC or Roblox emergency services communities.\n\n<:Cancel:1494830662581092482> **No direct recruiting.** Recruiting members away from this server is strictly prohibited.\n\n<:Check:1494830681484824616> **Valid invite required.** All advertisements must include a valid Discord invite link.\n\n<:Dot:1496643767585865818> **Disclose sponsorships.** Paid or sponsored promotions must be clearly disclosed.\n\n-# Staff reserve the right to remove any advertisement at their discretion.',
  },
};

async function handleDashboardSelect(interaction) {
  const value = interaction.values[0];
  const data = INFO_EMBEDS[value];
  if (!data) return interaction.reply({ content: 'Unknown option.', flags: MessageFlags.Ephemeral });

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(data.title)
    .setDescription(data.description)
    .setThumbnail(config.branding.thumbnail)

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// ── Notification role select menu ─────────────────────────────────────────────
async function handleRoleSelect(interaction) {
  const selectedValues = interaction.values;
  const allNotifRoles = [
    config.roles.notifications.updates,
    config.roles.notifications.resources,
    config.roles.notifications.partnerships,
  ].filter(Boolean);

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member) return interaction.reply({ content: '<:Cancel:1494830662581092482> Could not fetch your member data.', flags: MessageFlags.Ephemeral });

  const added = [];
  const removed = [];

  for (const roleId of allNotifRoles) {
    const hasRole = member.roles.cache.has(roleId);
    const wantsRole = selectedValues.includes(roleId);
    const role = interaction.guild.roles.cache.get(roleId);
    const roleName = role ? role.name : roleId;

    if (wantsRole && !hasRole) {
      await member.roles.add(roleId).catch(() => {});
      added.push(roleName);
    } else if (!wantsRole && hasRole) {
      await member.roles.remove(roleId).catch(() => {});
      removed.push(roleName);
    }
  }

  const lines = [];
  if (added.length) lines.push(`<:On:1498148402180001942> ${added.join(', ')}`);
  if (removed.length) lines.push(`<:Off:1498148430634160248> ${removed.join(', ')}`);
  if (!lines.length) lines.push('<:Dot:1496643767585865818> No changes made.');

  await interaction.reply({ content: `Your notification roles have been updated.\n${lines.join('\n')}`, flags: MessageFlags.Ephemeral });
}

// ── Invite reset confirm button ──────────────────────────────────────────────
async function handleInviteResetButton(interaction) {
  const targetId = interaction.customId.split(':')[1];
  const invites  = readInvites();

  for (const [key, entry] of Object.entries(invites)) {
    if (entry.inviterId === targetId) delete invites[key];
  }
  writeInvites(invites);

  await interaction.update({
    content: `All tracked invite records for <@${targetId}> have been reset.`,
    embeds: [],
    components: [],
  });
}

// ── Main router ───────────────────────────────────────────────────────────────
module.exports = async (interaction, client) => {
  try {
    if (interaction.isButton()) {
      const prefix = interaction.customId.split(':')[0];
      if (prefix === 'app')         return handleApplicationButton(interaction, client);
      if (prefix === 'suggestion')  return handleSuggestionButton(interaction, client);
      if (prefix === 'partnership') return handlePartnershipButton(interaction, client);
      if (prefix === 'ticket')      return handleTicketButton(interaction, client);
      if (prefix === 'role')        return handleRolePanelButton(interaction);
      if (prefix === 'invitereset') return handleInviteResetButton(interaction);
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'dashboard:info') return handleDashboardSelect(interaction);
      if (interaction.customId === 'rolepanel:notifications') return handleRoleSelect(interaction);
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'ticket_modal') return handleTicketModal(interaction, client);
    }
  } catch (err) {
    console.error('[ComponentHandler] Error:', err);
    const errMsg = { content: 'An error occurred processing that action.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errMsg).catch(() => {});
    } else {
      await interaction.reply(errMsg).catch(() => {});
    }
  }
};
