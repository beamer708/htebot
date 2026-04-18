const {
  EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const {
  readTickets, writeTickets, getNextTicketNumber, formatTicketId,
  fetchAllMessages, buildTranscript, postTranscript, closeTicket, claimTicket,
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
    // DMs disabled — silently ignore
  }
}

// ── Application buttons ──────────────────────────────────────────────────────
async function handleApplicationButton(interaction, client) {
  const [, action, submissionId] = interaction.customId.split(':');
  const applications = readJSON('applications.json');
  const idx = applications.findIndex(a => a.id === submissionId);
  if (idx === -1) return interaction.reply({ content: 'Application not found.', ephemeral: true });

  const app = applications[idx];
  const staffTag = interaction.user.tag;
  const accepted = action === 'accept';

  applications[idx].status    = accepted ? 'accepted' : 'denied';
  applications[idx].reviewedBy = staffTag;
  applications[idx].reviewedAt = new Date().toISOString();
  writeJSON('applications.json', applications);

  const resultEmbed = new EmbedBuilder()
    .setColor(accepted ? config.colors.success : config.colors.error)
    .setTitle(accepted ? '✅ Application Accepted' : '❌ Application Denied')
    .setDescription(accepted
      ? `Your staff application for the **HowToERLC** Discord has been **accepted**!\nA staff member will be in touch with further steps.`
      : `Your staff application for the **HowToERLC** Discord has been **denied**.\nYou may re-apply in the future.`)
    .addFields({ name: 'Role Applied For', value: app.roleApplying || 'Unknown' })
    .setFooter({ text: `Reviewed by ${staffTag}` })
    .setTimestamp();

  await dmUser(client, app.discordId, resultEmbed);

  const reviewedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(accepted ? config.colors.success : config.colors.error)
    .setFooter({ text: `${accepted ? 'Accepted' : 'Denied'} by ${staffTag} • ${new Date().toLocaleString()}` });

  await interaction.update({ embeds: [reviewedEmbed], components: [] });
}

// ── Suggestion buttons ───────────────────────────────────────────────────────
async function handleSuggestionButton(interaction, client) {
  const [, action, submissionId] = interaction.customId.split(':');
  const suggestions = readJSON('suggestions.json');
  const idx = suggestions.findIndex(s => s.id === submissionId);
  if (idx === -1) return interaction.reply({ content: 'Suggestion not found.', ephemeral: true });

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
    const voteIdx = fields.findIndex(f => f.name === '📊 Votes');
    if (voteIdx !== -1) fields[voteIdx].value = `👍 ${up}  •  👎 ${down}`;
    else fields.push({ name: '📊 Votes', value: `👍 ${up}  •  👎 ${down}`, inline: false });

    return interaction.update({ embeds: [updatedEmbed] });
  }

  // Approve / decline (staff only)
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const isStaff = member && (
    member.roles.cache.has(config.roles.staff) ||
    member.roles.cache.has(config.roles.admin) ||
    member.permissions.has('ManageGuild')
  );
  if (!isStaff) return interaction.reply({ content: 'Only staff can approve or decline suggestions.', ephemeral: true });

  const accepted = action === 'approve';
  const staffTag = interaction.user.tag;
  suggestions[idx].status     = accepted ? 'approved' : 'declined';
  suggestions[idx].reviewedBy  = staffTag;
  suggestions[idx].reviewedAt  = new Date().toISOString();
  writeJSON('suggestions.json', suggestions);

  const resultEmbed = new EmbedBuilder()
    .setColor(accepted ? config.colors.success : config.colors.error)
    .setTitle(accepted ? '✅ Suggestion Approved' : '❌ Suggestion Declined')
    .setDescription(accepted
      ? `Your suggestion **"${suggestion.title}"** has been **approved** by the HowToERLC staff team!`
      : `Your suggestion **"${suggestion.title}"** has been **declined** by the HowToERLC staff team.`)
    .setFooter({ text: `Reviewed by ${staffTag}` })
    .setTimestamp();

  await dmUser(client, suggestion.discordId, resultEmbed);

  const reviewedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(accepted ? config.colors.success : config.colors.error)
    .setFooter({ text: `${accepted ? 'Approved' : 'Declined'} by ${staffTag} • ${new Date().toLocaleString()}` });

  await interaction.update({ embeds: [reviewedEmbed], components: [] });
}

// ── Partnership buttons ──────────────────────────────────────────────────────
async function handlePartnershipButton(interaction, client) {
  const [, action, submissionId] = interaction.customId.split(':');
  const partnerships = readJSON('partnerships.json');
  const idx = partnerships.findIndex(p => p.id === submissionId);
  if (idx === -1) return interaction.reply({ content: 'Partnership not found.', ephemeral: true });

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const isStaff = member && (
    member.roles.cache.has(config.roles.staff) ||
    member.roles.cache.has(config.roles.admin) ||
    member.permissions.has('ManageGuild')
  );
  if (!isStaff) return interaction.reply({ content: 'Only staff can review partnership requests.', ephemeral: true });

  const partnership = partnerships[idx];
  const accepted    = action === 'approve';
  const staffTag    = interaction.user.tag;
  partnerships[idx].status     = accepted ? 'approved' : 'denied';
  partnerships[idx].reviewedBy  = staffTag;
  partnerships[idx].reviewedAt  = new Date().toISOString();
  writeJSON('partnerships.json', partnerships);

  const resultEmbed = new EmbedBuilder()
    .setColor(accepted ? config.colors.success : config.colors.error)
    .setTitle(accepted ? '🤝 Partnership Approved' : '❌ Partnership Denied')
    .setDescription(accepted
      ? `Your partnership request for **${partnership.serverName}** has been **approved** by HowToERLC!\nA staff member will reach out with next steps.`
      : `Your partnership request for **${partnership.serverName}** has been **denied** by HowToERLC.`)
    .setFooter({ text: `Reviewed by ${staffTag}` })
    .setTimestamp();

  if (partnership.contactId) await dmUser(client, partnership.contactId, resultEmbed);

  const reviewedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(accepted ? config.colors.success : config.colors.error)
    .setFooter({ text: `${accepted ? 'Approved' : 'Denied'} by ${staffTag} • ${new Date().toLocaleString()}` });

  await interaction.update({ embeds: [reviewedEmbed], components: [] });
}

// ── Ticket buttons ───────────────────────────────────────────────────────────
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

  if (action === 'close')      return closeTicket(interaction, client);
  if (action === 'claim')      return claimTicket(interaction, client);
  if (action === 'transcript') return handleTicketTranscript(interaction, client);
}

async function handleTicketTranscript(interaction, client) {
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const isStaff = member && (
    member.roles.cache.has(config.roles.staff) ||
    member.roles.cache.has(config.roles.admin) ||
    member.permissions.has('ManageChannels')
  );
  if (!isStaff) {
    return interaction.reply({ content: '❌ Only staff can generate transcripts.', ephemeral: true });
  }

  const ticketsData = readTickets();
  const ticket = Object.values(ticketsData).find(t => t.channelId === interaction.channel.id);
  if (!ticket) {
    return interaction.reply({ content: '❌ No ticket found for this channel.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const messages = await fetchAllMessages(interaction.channel).catch(() => []);
  const transcriptText = buildTranscript(ticket, messages);
  const attachment = new AttachmentBuilder(Buffer.from(transcriptText), { name: `${ticket.id}.txt` });

  // Reply to staff
  await interaction.editReply({
    content: `📄 Transcript for **${ticket.id}** (${messages.length} messages):`,
    files: [attachment],
  });

  // Also archive to ticketTranscripts
  const closedBy = ticket.closedBy || interaction.user.tag;
  await postTranscript(interaction.guild, ticket, messages, closedBy);
}

// ── Ticket modal submit ──────────────────────────────────────────────────────
async function handleTicketModal(interaction, client) {
  const subject     = interaction.fields.getTextInputValue('ticket_subject');
  const description = interaction.fields.getTextInputValue('ticket_description');
  const priorityRaw = interaction.fields.getTextInputValue('ticket_priority').trim();
  const priority    = ['low', 'medium', 'high'].includes(priorityRaw.toLowerCase())
    ? priorityRaw.charAt(0).toUpperCase() + priorityRaw.slice(1).toLowerCase()
    : 'Medium';

  const guild = interaction.guild;
  const user  = interaction.user;

  const ticketsData = readTickets();

  // Check for existing open ticket
  const existing = Object.values(ticketsData).find(
    t => t.userId === user.id && t.status !== 'closed'
  );
  if (existing) {
    return interaction.reply({
      content: `❌ You already have an open ticket: <#${existing.channelId}>`,
      ephemeral: true,
    });
  }

  const ticketNum = getNextTicketNumber(ticketsData);
  const ticketId  = formatTicketId(ticketNum);

  const channel = await guild.channels.create({
    name: ticketId,
    parent: config.categories.tickets || null,
    permissionOverwrites: [
      { id: guild.id,         deny:  [PermissionFlagsBits.ViewChannel] },
      { id: user.id,          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
                                      PermissionFlagsBits.AttachFiles,  PermissionFlagsBits.ReadMessageHistory] },
      { id: config.roles.staff, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.AttachFiles,  PermissionFlagsBits.ReadMessageHistory,
                                        PermissionFlagsBits.ManageMessages] },
    ],
  });

  const now = new Date().toISOString();
  ticketsData[ticketId] = {
    id: ticketId, number: ticketNum, channelId: channel.id,
    userId: user.id, username: user.tag,
    subject, description, priority,
    status: 'open', claimedBy: null, claimedAt: null,
    openedAt: now, closedAt: null, closedBy: null, messages: [],
  };
  writeTickets(ticketsData);

  const ticketEmbed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`🎫 Ticket #${String(ticketNum).padStart(4, '0')} — ${subject}`)
    .setDescription(description)
    .addFields(
      { name: '👤 Opened By', value: `<@${user.id}> (${user.id})`,                               inline: true  },
      { name: '📌 Priority',  value: priority,                                                    inline: true  },
      { name: '⏰ Opened At', value: `<t:${Math.floor(new Date(now).getTime() / 1000)}:F>`,       inline: true  },
      { name: '🆔 Ticket ID', value: ticketId,                                                    inline: true  },
    )
    .setFooter({ text: 'HowToERLC Support • Use the buttons below to manage this ticket' })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:close').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket:claim').setLabel('📋 Claim Ticket').setStyle(ButtonStyle.Primary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:transcript').setLabel('📄 Transcript').setStyle(ButtonStyle.Secondary),
  );

  await channel.send({
    content: `<@${user.id}> <@&${config.roles.staff}> — New ticket opened`,
    embeds: [ticketEmbed],
    components: [row1, row2],
  });

  await interaction.reply({ content: `✅ Your ticket has been created: ${channel}`, ephemeral: true });
}

// ── Role panel buttons ───────────────────────────────────────────────────────
async function handleRolePanelButton(interaction) {
  const [, roleId] = interaction.customId.split(':');
  const member = interaction.member;

  if (member.roles.cache.has(roleId)) {
    await member.roles.remove(roleId);
    return interaction.reply({ content: `✅ Removed role <@&${roleId}>.`, ephemeral: true });
  } else {
    await member.roles.add(roleId);
    return interaction.reply({ content: `✅ Added role <@&${roleId}>.`, ephemeral: true });
  }
}

// ── Notification role select menu ────────────────────────────────────────────
async function handleNotificationSelect(interaction) {
  const allRoleIds = [
    config.roles.notifications.updates,
    config.roles.notifications.resources,
    config.roles.notifications.partnerships,
  ];

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const selected = interaction.values;

  const added   = [];
  const removed = [];

  for (const roleId of allRoleIds) {
    const hasRole = member.roles.cache.has(roleId);
    const wants   = selected.includes(roleId);
    const role    = interaction.guild.roles.cache.get(roleId);

    if (wants && !hasRole) {
      await member.roles.add(roleId).catch(() => {});
      if (role) added.push(role.name);
    } else if (!wants && hasRole) {
      await member.roles.remove(roleId).catch(() => {});
      if (role) removed.push(role.name);
    }
  }

  const lines = ['✅ Your notification roles have been updated!'];
  if (added.length > 0)   lines.push(`**Added:** ${added.join(', ')}`);
  if (removed.length > 0) lines.push(`**Removed:** ${removed.join(', ')}`);
  if (added.length === 0 && removed.length === 0) lines.push('No changes made.');

  return interaction.reply({ content: lines.join('\n'), ephemeral: true });
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
    content: `✅ All tracked invite records for <@${targetId}> have been reset.`,
    embeds: [],
    components: [],
  });
}

// ── Main router ──────────────────────────────────────────────────────────────
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
      const prefix = interaction.customId.split(':')[0];
      if (prefix === 'rolepanel' && interaction.customId === 'rolepanel:notifications') {
        return handleNotificationSelect(interaction);
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'ticket_modal') return handleTicketModal(interaction, client);
    }
  } catch (err) {
    console.error('[ComponentHandler] Error:', err);
    const errMsg = { content: 'An error occurred processing that action.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errMsg).catch(() => {});
    } else {
      await interaction.reply(errMsg).catch(() => {});
    }
  }
};
