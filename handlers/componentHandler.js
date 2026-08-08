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
const { handleStaffApplyButton, handleStaffApplyModal, handleAppReviewButton, handleAppApproveModal, handleAppDenyModal, handleAppUnlock } = require('./appHandler');
const {
  handleListingApprove, handleListingDenyButton, handleListingDenyModal,
  APPROVE_PREFIX: LISTING_APPROVE_PREFIX, DENY_PREFIX: LISTING_DENY_PREFIX, DENY_MODAL_PREFIX: LISTING_DENY_MODAL_PREFIX,
} = require('./listingModHandler');
const { handleSuggestModal, handleSugApprove, handleSugDeny } = require('./sugHandler');
const { handleSearchNav } = require('./searchHandler');
const { handlePanelInteraction } = require('./panelHandler');
const { handleStickyInteraction } = require('./stickyHandler');

const dataPath = (file) => path.join(__dirname, '..', 'data', file);

function readJSON(file)        { try { return JSON.parse(fs.readFileSync(dataPath(file), 'utf8')); } catch { return []; } }
function writeJSON(file, data) { fs.writeFileSync(dataPath(file), JSON.stringify(data, null, 2)); }

const invitesPath      = dataPath('invites.json');
const prRegisteredPath = dataPath('prRegistered.json');
const prPayoutsPath    = dataPath('prPayouts.json');

function readInvites()        { try { return JSON.parse(fs.readFileSync(invitesPath, 'utf8')); }      catch { return {}; } }
function writeInvites(d)      { fs.writeFileSync(invitesPath, JSON.stringify(d, null, 2)); }
function readPrRegistered()   { try { return JSON.parse(fs.readFileSync(prRegisteredPath, 'utf8')); } catch { return {}; } }
function writePrRegistered(d) { fs.writeFileSync(prRegisteredPath, JSON.stringify(d, null, 2)); }
function readPrPayouts()      { try { return JSON.parse(fs.readFileSync(prPayoutsPath, 'utf8')); }    catch { return {}; } }
function writePrPayouts(d)    { fs.writeFileSync(prPayoutsPath, JSON.stringify(d, null, 2)); }

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// PR payout thresholds — single source of truth in config.prPayout
const PR_REQUIRED  = config.prPayout?.requiredRetained ?? 5;
const PR_DAYS      = config.prPayout?.retentionDays ?? 14;
const PR_ROBUX     = config.prPayout?.rewardRobux ?? 50;

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
  if (idx === -1) return interaction.reply({ content: '<:circlex:1507191508657508503> Application not found.', flags: MessageFlags.Ephemeral });

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const isStaff = member && (
    member.roles.cache.has(config.roles.staff) ||
    member.roles.cache.has(config.roles.admin) ||
    member.permissions.has('ManageGuild')
  );
  if (!isStaff) return interaction.reply({ content: '<:circlex:1507191508657508503> Only staff can review applications.', flags: MessageFlags.Ephemeral });

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
  if (idx === -1) return interaction.reply({ content: '<:circlex:1507191508657508503> Suggestion not found.', flags: MessageFlags.Ephemeral });

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
  if (!isStaff) return interaction.reply({ content: '<:circlex:1507191508657508503> Only staff can approve or decline suggestions.', flags: MessageFlags.Ephemeral });

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
  if (idx === -1) return interaction.reply({ content: '<:circlex:1507191508657508503> Partnership not found.', flags: MessageFlags.Ephemeral });

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const isStaff = member && (
    member.roles.cache.has(config.roles.staff) ||
    member.roles.cache.has(config.roles.admin) ||
    member.permissions.has('ManageGuild')
  );
  if (!isStaff) return interaction.reply({ content: '<:circlex:1507191508657508503> Only staff can review partnership requests.', flags: MessageFlags.Ephemeral });

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
    return interaction.reply({ content: '<:circlex:1507191508657508503> Only staff can generate transcripts.', flags: MessageFlags.Ephemeral });
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
    .setTitle(`<:Headset:1507191521407926322> Ticket #${String(ticketNum).padStart(4, '0')} — ${subject}`)
    .setDescription(description)
    .addFields(
      { name: 'Opened By', value: `<@${user.id}> (${user.id})`,                             inline: true },
      { name: 'Priority',  value: priority,                                                   inline: true },
      { name: 'Opened At', value: `<t:${Math.floor(new Date(now).getTime() / 1000)}:F>`,     inline: true },
      { name: 'Ticket ID', value: ticketId,                                                   inline: true },
    )
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:close')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji({ name: 'circlex', id: '1507191508657508503' }),
    new ButtonBuilder()
      .setCustomId('ticket:claim')
      .setLabel('Claim Ticket')
      .setStyle(ButtonStyle.Primary)
      .setEmoji({ name: 'usercheck', id: '1507191543952310404' }),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:transcript')
      .setLabel('Transcript')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji({ name: 'FileText', id: '1507191520636436510' }),
  );

  await channel.send({
    content: `<@${user.id}> <@&${config.roles.staff}> — New ticket opened`,
    embeds: [ticketEmbed],
    components: [row1, row2],
  });

  await interaction.reply({ content: `<:circlecheck:1507191508066107532> Your ticket has been created: ${channel}`, flags: MessageFlags.Ephemeral });
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

// ── Staff handbook select menu ────────────────────────────────────────────────
const STAFF_HANDBOOK = {
  role: {
    title: 'Your Role',
    description:
      '-# As a staff member at HowToERLC your job is to keep the server safe, welcoming, and on-topic at all times. ' +
      'You are the first line of response for rule violations, member questions, and support tickets.\n\n' +
      '- Monitor all public channels for rule violations\n' +
      '- Keep the advertising channels clean and compliant\n' +
      '- Welcome new members and point them in the right direction\n' +
      '- Handle or escalate support tickets when needed\n' +
      '- Represent HowToERLC professionally at all times\n\n' +
      '-# When in doubt, escalate to a senior staff member or admin rather than acting alone.',
  },
  rules: {
    title: 'Server and Advertising Rules',
    description:
      '**Server Rules**\n' +
      '-# Watch for the following violations in all public channels:\n' +
      '- Disrespect, harassment, or hate speech toward any member\n' +
      '- Spam, excessive pinging, or flooding any channel\n' +
      '- Off-topic content or self-promotion outside designated channels\n' +
      '- Sharing content that violates Roblox or Discord ToS\n\n' +
      '**Advertising Rules**\n' +
      '-# Advertisements must follow these rules or be removed immediately:\n' +
      '- Must be ERLC or Roblox emergency services related\n' +
      '- Must include a valid Discord invite link\n' +
      '- No recruiting members away from HowToERLC\n' +
      '- Paid promotions must be clearly disclosed\n\n' +
      '**How to respond**\n' +
      '- Issue a verbal warning in the channel or via DM for minor violations\n' +
      '- Remove non-compliant advertisements immediately\n' +
      '- Escalate repeated violations to a senior staff member',
  },
  welcoming: {
    title: 'Welcoming Members',
    description:
      '-# First impressions matter. When a new member joins, make them feel welcome and help them get oriented.\n\n' +
      '- Greet new members in the welcome channel if one is active\n' +
      '- If a member asks where to start, point them to the main dashboard and the website **howtoerlc.xyz**\n' +
      '- If a member is lost or confused, answer their question directly — do not just send a rules link\n' +
      '- Encourage members to grab their notification roles from the dashboard\n\n' +
      '**What to say if asked about resources:**\n' +
      'Direct them to the resources, tools, and templates channels or to **howtoerlc.xyz** for the full library.\n\n' +
      '-# You do not need to greet every single member. Focus on those who ask questions or seem lost.',
  },
  tickets: {
    title: 'Support Tickets',
    description:
      '-# Support tickets are opened by members who need help. As staff you are responsible for monitoring and responding to them.\n\n' +
      '**How tickets work**\n' +
      '- When a ticket is created, a private channel is opened with the member and the staff team\n' +
      '- Click **Claim** to take ownership of the ticket — this hides it from other staff so there is no overlap\n' +
      '- Once resolved, click **Close** to close the ticket and delete the channel\n' +
      '- Use **Transcript** before closing if a record is needed\n\n' +
      '**When to action a ticket**\n' +
      '- Claim a ticket if you can fully resolve the issue\n' +
      '- Leave it open if a more qualified staff member should handle it\n' +
      '- Do not close a ticket without resolving the member\'s issue\n' +
      '- Do not share ticket contents outside of the ticket channel\n\n' +
      '**Adding other members**\n' +
      'Use `/add @user` inside a ticket to give another member access if they are involved in the issue.',
  },
  commands: {
    title: 'Bot Commands',
    description:
      '-# As a staff member you have access to the following bot commands:\n\n' +
      '**Application Management**\n' +
      '- `/approve` — Approve a staff application and notify the applicant via DM\n' +
      '- `/deny` — Deny a staff application and notify the applicant via DM\n' +
      '- `/search` — Search for an application, member, or invite record by username or ID\n\n' +
      '**Ticket Management**\n' +
      '- `/add @user` — Add a member to the current ticket channel with view and send access\n' +
      '- **Claim** button — Take ownership of an open ticket\n' +
      '- **Close** button — Close a ticket and delete its channel after 10 seconds\n' +
      '- **Transcript** button — Export a copy of the ticket conversation\n\n' +
      '**Admin Only**\n' +
      '- `/panel` — Post or refresh a server panel (Dashboard, Rules, Campaigns, Get Started, Handbooks) in a channel\n\n' +
      '-# Do not use admin commands in public channels. All actions are logged.',
  },
};

async function handleStaffHandbook(interaction) {
  const value = interaction.values[0];
  const data  = STAFF_HANDBOOK[value];
  if (!data) return interaction.reply({ content: 'Unknown section.', flags: MessageFlags.Ephemeral });

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(data.title)
    .setDescription(data.description)
    .setThumbnail(config.branding.thumbnail);

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// ── Dashboard info select menu ────────────────────────────────────────────────
const INFO_EMBEDS = {
  info_about: {
    title: 'About HowToERLC',
    description: '-# HowToERLC is the leading resource hub for ERLC community owners and builders on Roblox.\n\nWe provide free guides, templates, department structures, livery resources, and direct community support to help you build and run a successful ERLC server.\n\n-# Visit **howtoerlc.xyz** to submit staff applications, share suggestions, request partnerships, and access an AI assistant built specifically for ERLC.',
  },
  info_guidelines: {
    title: 'Server Guidelines',
    description: '-# By being in this server you agree to follow these rules and Discord\'s Terms of Service.\n\n- **Be respectful.** Treat all members and staff with respect. Harassment, hate speech, and discrimination are not tolerated.\n- **Keep it relevant.** All content must relate to ERLC community building. Off-topic discussions belong in designated channels.\n- **No spam or self-promotion.** Unsolicited promotion and spam are not permitted outside of designated channels.\n- **Follow Roblox & Discord ToS.** All Roblox and Discord Terms of Service apply at all times.\n- **Staff decisions are final.** Repeated violations will result in removal from the server.',
  },
  info_advertising: {
    title: 'Advertising Guidelines',
    description: '-# Advertisements are permitted in the designated channel only and must follow these rules.\n\n- **ERLC-related only.** Ads must be directly related to ERLC or Roblox emergency services communities.\n- **No direct recruiting.** Recruiting members away from this server is strictly prohibited.\n- **Valid invite required.** All advertisements must include a valid Discord invite link.\n- **Disclose sponsorships.** Paid or sponsored promotions must be clearly disclosed.\n\n-# Staff reserve the right to remove any advertisement at their discretion.',
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
  // Must exactly match the options offered by the notification menu in
  // handlers/panelHandler (and any legacy panels still posted). A role listed
  // here but not offered would be silently stripped from anyone who has it.
  const allNotifRoles = [
    config.roles.notifications.updates,
    config.roles.notifications.resources,
    config.roles.notifications.announcements,
  ].filter(Boolean);

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member) return interaction.reply({ content: '<:circlex:1507191508657508503> Could not fetch your member data.', flags: MessageFlags.Ephemeral });

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
  if (added.length) lines.push(`<:toggleright:1507191541574271076> ${added.join(', ')}`);
  if (removed.length) lines.push(`<:toggleleft:1507191540563312731> ${removed.join(', ')}`);
  if (!lines.length) lines.push('- No changes made.');

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

// ═══════════════════════════════════════════════════════════════════════════════
// PR TEAM HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

async function hasPrAccess(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  return member && (
    member.roles.cache.has(config.roles.prTeam) ||
    member.roles.cache.has(config.roles.prManager) ||
    member.permissions.has('ManageGuild')
  );
}

async function hasPrManagerAccess(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  return member && (
    member.roles.cache.has(config.roles.prManager) ||
    member.permissions.has('ManageGuild')
  );
}

async function logToPr(guild, embed, content) {
  const ch = guild.channels.cache.get(config.channels.prLogs);
  if (ch) await ch.send({ content: content || undefined, embeds: [embed] }).catch(() => {});
}

// ── Assets select menu ────────────────────────────────────────────────────────
async function handlePrAssets(interaction) {
  if (!await hasPrAccess(interaction)) {
    return interaction.reply({ content: '<:circlex:1507191508657508503> This panel is restricted to PR Team members only.', flags: MessageFlags.Ephemeral });
  }
  const value = interaction.values[0];
  if (value === 'advertisement') {
    return interaction.reply({
      content:
        '**@howtoerlc** is the #1 resource hub for serious ERLC communities.\n' +
        'Stop wasting time searching. Everything you need to build, structure, and grow your server organized in one place.\n\n' +
        '**Website:**\nhttps://howtoerlc.xyz\n**Discord**\nhttps://discord.gg/HjcqH2djjC',
      flags: MessageFlags.Ephemeral,
    });
  }
  if (value === 'invitation') {
    return interaction.reply({
      content:
        '**@howtoerlc Invitation Offer**\n' +
        '> Hey, on behalf of the @howtoerlc team we would like to invite you to our server to advertise. We\'ve noticed you use other advertising servers across ER:LC and we believe we would be a great resource hub for your server!\n\n' +
        '**Website:**\nhttps://howtoerlc.xyz\n**Discord**\nhttps://discord.gg/HjcqH2djjC',
      flags: MessageFlags.Ephemeral,
    });
  }
}

// ── Handbook select menu ──────────────────────────────────────────────────────
async function handlePrHandbook(interaction) {
  if (!await hasPrAccess(interaction)) {
    return interaction.reply({ content: '<:circlex:1507191508657508503> This panel is restricted to PR Team members only.', flags: MessageFlags.Ephemeral });
  }
  const value = interaction.values[0];
  let embed;

  if (value === 'role') {
    embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('What is the PR Team?')
      .setDescription(
        '-# The HowToERLC PR (Public Relations) Team grows the server by building partnerships across the ERLC community.\n\n' +
        '**As a PR Team member, your job is to:**\n' +
        '- Find and approach ERLC communities, servers, and players\n' +
        '- Invite them to join HowToERLC using your personal invite link\n' +
        '- Use the outreach templates in the **Assets** section for messaging\n' +
        '- Represent HowToERLC professionally at all times\n\n' +
        '-# The PR Team Manager monitors invite activity, reviews invite stats, and processes all payout requests.'
      )
      .setFooter({ text: 'HowToERLC PR Team Handbook' });
  } else if (value === 'invite_setup') {
    embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('Invite Link Setup')
      .setDescription(
        '**Step 1. Create a permanent invite**\n' +
        '- Right-click any channel → **Invite People**\n' +
        '- Click **Edit invite link** → set expiry to **Never**\n' +
        '- Copy your invite code (the part after `discord.gg/`)\n\n' +
        '**Step 2. Register it with the bot**\n' +
        '- Click the **Register Invite** button on the PR Panel\n' +
        '- Enter your invite code in the modal that appears\n' +
        '- The bot will verify and link it to your account\n\n' +
        '**Step 3. Share it**\n' +
        '- Use the **Assets** menu for ready-to-use outreach templates\n' +
        '- The bot automatically tracks everyone who joins via your link\n\n' +
        '-# Only one invite code per member. Contact a PR Manager to change yours.'
      )
      .setFooter({ text: 'HowToERLC PR Team Handbook' });
  } else if (value === 'payouts') {
    embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('Payout System')
      .setDescription(
        '**Earning a payout**\n' +
        `- Earn **${PR_ROBUX} Robux** for every **${PR_REQUIRED} retained invites**\n` +
        `- A retained invite is someone you invited who stayed **${PR_DAYS}+ days**\n\n` +
        '**How to claim**\n' +
        `1. Reach **${PR_REQUIRED} retained invites**, check with **My Stats**\n` +
        '2. Click **Request Payout** on the PR Panel\n' +
        '3. A **PR Manager** reviews your request in `#pr-logs`\n' +
        `4. Once approved, you will be contacted for your **${PR_ROBUX} Robux**\n\n` +
        '**Rules**\n' +
        `- Members must stay **${PR_DAYS} full days** to count as retained\n` +
        `- After payout approval, your counter resets for the next ${PR_REQUIRED}\n` +
        '- Do not submit duplicate payout requests'
      )
      .setFooter({ text: 'HowToERLC PR Team Handbook' });
  } else if (value === 'tracking') {
    embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('Tracking and Stats')
      .setDescription(
        '**How tracking works**\n' +
        '- When someone joins via your registered invite, the bot records the event\n' +
        `- Each invited member starts a **${PR_DAYS}-day retention timer**\n` +
        `- Still in the server after ${PR_DAYS} days: **Retained**\n` +
        `- Left before ${PR_DAYS} days: **Lost**\n\n` +
        '**Your stats**\n' +
        '- **Total**: all who ever joined via your link\n' +
        `- **Retained**: stayed ${PR_DAYS}+ days (count toward payout)\n` +
        `- **Pending**: still within their ${PR_DAYS}-day window\n` +
        `- **Lost**: left before ${PR_DAYS} days\n\n` +
        '-# All activity is logged in `#pr-logs` for the PR Manager to monitor.'
      )
      .setFooter({ text: 'HowToERLC PR Team Handbook' });
  }

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// ── My Stats button ───────────────────────────────────────────────────────────
async function handlePrMyStats(interaction) {
  if (!await hasPrAccess(interaction)) {
    return interaction.reply({ content: '<:circlex:1507191508657508503> This panel is restricted to PR Team members only.', flags: MessageFlags.Ephemeral });
  }

  const userId         = interaction.user.id;
  const invites        = readInvites();
  const registered     = readPrRegistered();
  const payouts        = readPrPayouts();
  const myReg          = registered[userId];

  const all            = Object.values(invites).filter(e => e.inviterId === userId);
  const retained       = all.filter(e => e.retained);
  const unpaidRetained = retained.filter(e => !e.payoutId);
  const pending        = all.filter(e => !e.retained && !e.leftAt);
  const lost           = all.filter(e => e.leftAt && !e.retained);
  const paidOut        = Object.values(payouts).filter(p => p.memberId === userId && p.status === 'approved').length;
  const eligible       = unpaidRetained.length >= PR_REQUIRED;
  const needed         = Math.max(0, PR_REQUIRED - unpaidRetained.length);
  const pendingPayout  = Object.values(payouts).find(p => p.memberId === userId && p.status === 'pending');

  const embed = new EmbedBuilder()
    .setColor(eligible ? config.colors.success : config.colors.info)
    .setTitle(`<:chartbar:1507191493603885256> PR Stats — ${interaction.user.username}`)
    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      {
        name: '<:Link:1507191523094167573> Registered Invite',
        value: myReg
          ? `\`discord.gg/${myReg.inviteCode}\``
          : '<:circlex:1507191508657508503> Not registered — click **Register Invite**',
        inline: false,
      },
      { name: '<:Select:1507191532875153519> Total Invites',          value: `${all.length}`,       inline: true },
      { name: `<:circlecheck:1507191508066107532> Retained (${PR_DAYS}d)`, value: `${retained.length}`, inline: true },
      { name: '<:clockhour4:1507191510792142868> Pending',            value: `${pending.length}`,    inline: true },
      { name: '<:circlex:1507191508657508503> Lost',                  value: `${lost.length}`,       inline: true },
      { name: '<:crown:1507191516274360492> Payouts Earned',          value: `${paidOut}`,           inline: true },
      {
        name: '<:Coin:1507191513418039388> Payout Status',
        value: pendingPayout
          ? '<:clockhour4:1507191510792142868> Payout request **pending review** by a PR Manager'
          : eligible
            ? `<:circlecheck:1507191508066107532> **Eligible!** Click **Request Payout** to claim your ${PR_ROBUX} Robux`
            : `<:circlex:1507191508657508503> Need **${needed}** more retained invite${needed !== 1 ? 's' : ''} (${unpaidRetained.length}/${PR_REQUIRED})`,
        inline: false,
      },
    )
    .setFooter({ text: 'HowToERLC PR Team • Stats update in real-time' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// ── Register Invite button ────────────────────────────────────────────────────
async function handlePrRegister(interaction) {
  if (!await hasPrAccess(interaction)) {
    return interaction.reply({ content: '<:circlex:1507191508657508503> This panel is restricted to PR Team members only.', flags: MessageFlags.Ephemeral });
  }
  const modal = new ModalBuilder()
    .setCustomId('pr_register_modal')
    .setTitle('Register Your Invite Link');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('pr_invite_code')
        .setLabel('Invite Code')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. HjcqH2djjC  (part after discord.gg/)')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(30)
    ),
  );
  return interaction.showModal(modal);
}

// ── Register modal submit ─────────────────────────────────────────────────────
async function handlePrRegisterModal(interaction, client) {
  if (!await hasPrAccess(interaction)) {
    return interaction.reply({ content: '<:circlex:1507191508657508503> This panel is restricted to PR Team members only.', flags: MessageFlags.Ephemeral });
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const userId     = interaction.user.id;
  const rawCode    = interaction.fields.getTextInputValue('pr_invite_code').trim();
  const inviteCode = rawCode.replace(/^(https?:\/\/)?(www\.)?discord\.(gg|com\/invite)\//, '').trim();

  let invite;
  try {
    invite = await interaction.guild.invites.fetch(inviteCode);
  } catch {
    return interaction.editReply({
      content: `<:circlex:1507191508657508503> Could not find invite code \`${inviteCode}\` in this server. Make sure it's a valid server invite.`,
    });
  }

  const registered = readPrRegistered();
  const existing   = registered[userId];

  registered[userId] = {
    inviteCode,
    registeredAt: new Date().toISOString(),
    updatedAt: existing ? new Date().toISOString() : null,
  };
  writePrRegistered(registered);

  const logEmbed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('PR Invite Registered')
    .setDescription('-# A PR Team member linked an invite to their account.')
    .addFields(
      { name: 'Member',      value: `<@${userId}> (${interaction.user.tag})`, inline: true },
      { name: 'Invite Code', value: `\`discord.gg/${inviteCode}\``,           inline: true },
      { name: 'Action',      value: existing ? 'Updated existing registration' : 'New registration', inline: true },
      { name: 'Registered At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
    )
    .setTimestamp();
  await logToPr(interaction.guild, logEmbed);

  let reply = `<:circlecheck:1507191508066107532> Your invite \`discord.gg/${inviteCode}\` has been registered! The bot will now track everyone who joins via this link.`;
  if (invite.maxAge && invite.maxAge !== 0) {
    reply += '\n\n<:alerttriangle:1507191481906106398> This invite has an expiry set. Please recreate it as **permanent (Never expires)** and re-register as soon as possible.';
  }
  await interaction.editReply({ content: reply });
}

// ── Request Payout button ─────────────────────────────────────────────────────
async function handlePrPayout(interaction) {
  if (!await hasPrAccess(interaction)) {
    return interaction.reply({ content: '<:circlex:1507191508657508503> This panel is restricted to PR Team members only.', flags: MessageFlags.Ephemeral });
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const userId  = interaction.user.id;
  const invites = readInvites();
  const payouts = readPrPayouts();

  const existingPending = Object.values(payouts).find(p => p.memberId === userId && p.status === 'pending');
  if (existingPending) {
    return interaction.editReply({ content: '<:clockhour4:1507191510792142868> You already have a **pending payout request**. Wait for a PR Manager to review it before submitting another.' });
  }

  const unpaidRetained = Object.entries(invites).filter(
    ([, e]) => e.inviterId === userId && e.retained && !e.payoutId
  );

  if (unpaidRetained.length < PR_REQUIRED) {
    const needed = PR_REQUIRED - unpaidRetained.length;
    return interaction.editReply({
      content: `<:circlex:1507191508657508503> You need **${needed} more retained invite${needed !== 1 ? 's' : ''}** before requesting a payout.\n\nCurrent: **${unpaidRetained.length}/${PR_REQUIRED}** retained invites.`,
    });
  }

  const toClaim  = unpaidRetained.slice(0, PR_REQUIRED).map(([k]) => k);
  const payoutId = `payout_${generateId()}`;

  for (const uid of toClaim) invites[uid].payoutId = payoutId;
  writeInvites(invites);

  payouts[payoutId] = {
    memberId: userId, memberTag: interaction.user.tag,
    requestedAt: new Date().toISOString(),
    invitesClaimed: toClaim, retainedCount: PR_REQUIRED,
    status: 'pending', reviewedBy: null, reviewedAt: null,
  };
  writePrPayouts(payouts);

  const prLogChannel = interaction.guild.channels.cache.get(config.channels.prLogs);
  if (prLogChannel) {
    const payoutEmbed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('Payout Request, Pending Review')
      .setDescription(`<@&${config.roles.prManager}>\n-# A PR Team member has requested their payout.`)
      .addFields(
        { name: 'Member',         value: `<@${userId}> (${interaction.user.tag})`,        inline: true },
        { name: 'Retained Count', value: `${toClaim.length} invites`,                     inline: true },
        { name: 'Payout ID',      value: `\`${payoutId}\``,                               inline: true },
        { name: 'Amount',         value: `**${PR_ROBUX} Robux**`,                         inline: true },
        { name: 'Requested At',   value: `<t:${Math.floor(Date.now() / 1000)}:F>`,        inline: false },
      )
      .setFooter({ text: 'Use the buttons below to approve or deny' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`pr:approve:${payoutId}`)
        .setLabel('Approve Payout')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`pr:deny:${payoutId}`)
        .setLabel('Deny Payout')
        .setStyle(ButtonStyle.Danger)
        .setEmoji({ name: 'circlex', id: '1507191508657508503' }),
    );
    await prLogChannel.send({ embeds: [payoutEmbed], components: [row] }).catch(() => {});
  }

  return interaction.editReply({
    content: `<:circlecheck:1507191508066107532> Payout request submitted! A **PR Manager** will review it in <#${config.channels.prLogs}>. You'll be notified when it's processed.`,
  });
}

// ── Approve payout ────────────────────────────────────────────────────────────
async function handlePrPayoutApprove(interaction, client) {
  if (!await hasPrManagerAccess(interaction)) {
    return interaction.reply({ content: '<:circlex:1507191508657508503> Only PR Managers can approve payout requests.', flags: MessageFlags.Ephemeral });
  }
  const payoutId = interaction.customId.split(':')[2];
  const payouts  = readPrPayouts();
  const payout   = payouts[payoutId];
  if (!payout) return interaction.reply({ content: '<:circlex:1507191508657508503> Payout record not found.', flags: MessageFlags.Ephemeral });
  if (payout.status !== 'pending') return interaction.reply({ content: `<:circlex:1507191508657508503> This payout is already **${payout.status}**.`, flags: MessageFlags.Ephemeral });

  payout.status = 'approved'; payout.reviewedBy = interaction.user.tag; payout.reviewedAt = new Date().toISOString();
  writePrPayouts(payouts);

  const approvedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(config.colors.success)
    .setTitle('Payout Request, Approved')
    .setFooter({ text: `Approved by ${interaction.user.tag} • ${new Date().toLocaleString()}` });
  await interaction.update({ embeds: [approvedEmbed], components: [] });

  const approvedLog = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('Payout Approved')
    .setDescription(`-# Payout \`${payoutId}\` was approved and is being paid out.`)
    .addFields(
      { name: 'Member',           value: `<@${payout.memberId}> (${payout.memberTag})`, inline: true },
      { name: 'Retained Invites', value: `${payout.retainedCount}`,                     inline: true },
      { name: 'Amount',           value: `${PR_ROBUX} Robux`,                           inline: true },
      { name: 'Approved By',      value: `<@${interaction.user.id}>`,                   inline: true },
      { name: 'Approved At',      value: `<t:${Math.floor(Date.now() / 1000)}:F>`,      inline: true },
    )
    .setTimestamp();
  await logToPr(interaction.guild, approvedLog);

  const dmEmbed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('<:Confetti:1507191514042994748> Payout Approved!')
    .setDescription(`Your payout request for **HowToERLC** has been approved! You will receive your **${PR_ROBUX} Robux** shortly. Thank you for your contributions to the PR Team!`)
    .addFields(
      { name: 'Retained Invites', value: `${payout.retainedCount}`, inline: true },
      { name: 'Amount',           value: `${PR_ROBUX} Robux`,       inline: true },
      { name: 'Approved By',      value: interaction.user.tag,      inline: true },
    )
    .setFooter({ text: 'HowToERLC PR Team' })
    .setTimestamp();
  await dmUser(client, payout.memberId, dmEmbed);
}

// ── Deny payout ───────────────────────────────────────────────────────────────
async function handlePrPayoutDeny(interaction, client) {
  if (!await hasPrManagerAccess(interaction)) {
    return interaction.reply({ content: '<:circlex:1507191508657508503> Only PR Managers can deny payout requests.', flags: MessageFlags.Ephemeral });
  }
  const payoutId = interaction.customId.split(':')[2];
  const payouts  = readPrPayouts();
  const payout   = payouts[payoutId];
  if (!payout) return interaction.reply({ content: '<:circlex:1507191508657508503> Payout record not found.', flags: MessageFlags.Ephemeral });
  if (payout.status !== 'pending') return interaction.reply({ content: `<:circlex:1507191508657508503> This payout is already **${payout.status}**.`, flags: MessageFlags.Ephemeral });

  payout.status = 'denied'; payout.reviewedBy = interaction.user.tag; payout.reviewedAt = new Date().toISOString();
  writePrPayouts(payouts);

  // Restore payoutId on invite entries so the counter isn't lost
  const invites = readInvites();
  for (const uid of payout.invitesClaimed) { if (invites[uid]) invites[uid].payoutId = null; }
  writeInvites(invites);

  const deniedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(config.colors.error)
    .setTitle('Payout Request, Denied')
    .setFooter({ text: `Denied by ${interaction.user.tag} • ${new Date().toLocaleString()}` });
  await interaction.update({ embeds: [deniedEmbed], components: [] });

  const deniedLog = new EmbedBuilder()
    .setColor(config.colors.error)
    .setTitle('Payout Denied')
    .setDescription(`-# Payout \`${payoutId}\` was denied. The member's retained invites were restored.`)
    .addFields(
      { name: 'Member',           value: `<@${payout.memberId}> (${payout.memberTag})`, inline: true },
      { name: 'Retained Invites', value: `${payout.retainedCount}`,                     inline: true },
      { name: 'Denied By',        value: `<@${interaction.user.id}>`,                   inline: true },
      { name: 'Denied At',        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,      inline: true },
    )
    .setTimestamp();
  await logToPr(interaction.guild, deniedLog);

  const dmEmbed = new EmbedBuilder()
    .setColor(config.colors.error)
    .setTitle('<:circlex:1507191508657508503> Payout Request Denied')
    .setDescription('Your payout request for **HowToERLC** has been denied by the PR Team Manager. Your retained invites have been restored — you may submit a new request. Contact a PR Manager with any questions.')
    .addFields({ name: 'Denied By', value: interaction.user.tag, inline: true })
    .setFooter({ text: 'HowToERLC PR Team' })
    .setTimestamp();
  await dmUser(client, payout.memberId, dmEmbed);
}

// ── PR interaction router ─────────────────────────────────────────────────────
async function handlePrInteraction(interaction, client) {
  if (interaction.isButton()) {
    const action = interaction.customId.split(':')[1];
    if (action === 'mystats')  return handlePrMyStats(interaction);
    if (action === 'register') return handlePrRegister(interaction);
    if (action === 'payout')   return handlePrPayout(interaction);
    if (action === 'approve')  return handlePrPayoutApprove(interaction, client);
    if (action === 'deny')     return handlePrPayoutDeny(interaction, client);
  }
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'pr:assets')   return handlePrAssets(interaction);
    if (interaction.customId === 'pr:handbook') return handlePrHandbook(interaction);
    if (interaction.customId === 'pr:menu') {
      // Merged panel menu: asset values go to the assets handler, handbook
      // values to the handbook handler. Legacy customIds above stay working
      // for panels posted before the redesign.
      const value = interaction.values[0];
      if (value === 'advertisement' || value === 'invitation') return handlePrAssets(interaction);
      return handlePrHandbook(interaction);
    }
  }
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'pr_register_modal') return handlePrRegisterModal(interaction, client);
  }
}

// ── Main router ───────────────────────────────────────────────────────────────
module.exports = async (interaction, client) => {
  // NOTE: every dispatch below is `return await` — returning the bare promise
  // would skip this try/catch, and an unhandled rejection kills the process.
  try {
    if (interaction.isButton()) {
      // Listing moderation buttons use underscore customIds (listing_approve_{id})
      if (interaction.customId.startsWith(LISTING_APPROVE_PREFIX)) return await handleListingApprove(interaction, client);
      if (interaction.customId.startsWith(LISTING_DENY_PREFIX))    return await handleListingDenyButton(interaction);

      const prefix = interaction.customId.split(':')[0];
      if (prefix === 'panelsel')     return await handlePanelInteraction(interaction);
      if (prefix === 'sticky')       return await handleStickyInteraction(interaction, client);
      if (prefix === 'pr')           return await handlePrInteraction(interaction, client);
      if (interaction.customId === 'staff_apply') return await handleStaffApplyButton(interaction);
      if (prefix === 'app_review')   return await handleAppReviewButton(interaction, client);
      if (prefix === 'app_unlock')   return await handleAppUnlock(interaction, client);
      if (prefix === 'sug_approve')  return await handleSugApprove(interaction, client);
      if (prefix === 'sug_deny')     return await handleSugDeny(interaction, client);
      if (prefix === 'search_nav')   return await handleSearchNav(interaction);
      if (prefix === 'app')          return await handleApplicationButton(interaction, client);
      if (prefix === 'suggestion')   return await handleSuggestionButton(interaction, client);
      if (prefix === 'partnership')  return await handlePartnershipButton(interaction, client);
      if (prefix === 'ticket')       return await handleTicketButton(interaction, client);
      if (prefix === 'role')         return await handleRolePanelButton(interaction);
      if (prefix === 'invitereset')  return await handleInviteResetButton(interaction);
    }

    if (interaction.isStringSelectMenu()) {
      const prefix = interaction.customId.split(':')[0];
      if (prefix === 'panelsel')                              return await handlePanelInteraction(interaction);
      if (prefix === 'pr')                                    return await handlePrInteraction(interaction, client);
      if (interaction.customId === 'dashboard:info')          return await handleDashboardSelect(interaction);
      if (interaction.customId === 'rolepanel:notifications') return await handleRoleSelect(interaction);
      if (interaction.customId === 'staff:handbook')          return await handleStaffHandbook(interaction);
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith(LISTING_DENY_MODAL_PREFIX)) return await handleListingDenyModal(interaction, client);
      if (interaction.customId === 'pr_register_modal')              return await handlePrInteraction(interaction, client);
      if (interaction.customId === 'ticket_modal')                   return await handleTicketModal(interaction, client);
      if (interaction.customId === 'staff_apply_modal')              return await handleStaffApplyModal(interaction, client);
      if (interaction.customId === 'suggest_modal')                  return await handleSuggestModal(interaction, client);
      if (interaction.customId.startsWith('app_approve_modal:'))    return await handleAppApproveModal(interaction, client);
      if (interaction.customId.startsWith('app_deny_modal:'))       return await handleAppDenyModal(interaction, client);
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
