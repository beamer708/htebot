const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const config = require('../config.json');
const db = require('./db');

// ── DB helpers ────────────────────────────────────────────────────────────────

function mapRow(row) {
  if (!row) return null;
  return {
    id:            row.id,
    number:        row.number,
    channelId:     row.channel_id,
    userId:        row.user_id,
    username:      row.username,
    subject:       row.subject,
    description:   row.description,
    priority:      row.priority,
    status:        row.status,
    claimedBy:     row.claimed_by,
    claimedAt:     row.claimed_at,
    openedAt:      row.opened_at,
    closedAt:      row.closed_at,
    closedBy:      row.closed_by,
    closeReason:   row.close_reason,
    closeReqReason: row.close_req_reason,
  };
}

function getNextTicketNumber() {
  const row = db.prepare('SELECT MAX(number) as max FROM tickets').get();
  return (row.max || 0) + 1;
}

function formatTicketId(n) { return `ticket-${String(n).padStart(4, '0')}`; }

function getOpenTicketByChannel(channelId) {
  return mapRow(
    db.prepare("SELECT * FROM tickets WHERE channel_id = ? AND status != 'closed'").get(channelId)
  );
}

function getOpenTicketByUser(userId) {
  return mapRow(
    db.prepare("SELECT * FROM tickets WHERE user_id = ? AND status != 'closed'").get(userId)
  );
}

function createTicket({ id, number, channelId, userId, username, subject, description, priority, openedAt }) {
  db.prepare(`
    INSERT INTO tickets (id, number, channel_id, user_id, username, subject, description, priority, status, opened_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
  `).run(id, number, channelId, userId, username, subject, description, priority, openedAt);
}

function setTicketClaimed(ticketId, staffId, claimedAt) {
  db.prepare(`
    UPDATE tickets SET status = 'claimed', claimed_by = ?, claimed_at = ? WHERE id = ?
  `).run(staffId, claimedAt, ticketId);
}

function setTicketClosed(ticketId, closedBy, closeReason, closedAt) {
  db.prepare(`
    UPDATE tickets SET status = 'closed', closed_by = ?, close_reason = ?, closed_at = ?,
                       close_req_reason = NULL WHERE id = ?
  `).run(closedBy, closeReason || null, closedAt, ticketId);
}

function setCloseRequested(ticketId, reason) {
  db.prepare(`
    UPDATE tickets SET status = 'close_requested', close_req_reason = ? WHERE id = ?
  `).run(reason, ticketId);
}

function clearCloseRequest(ticketId) {
  db.prepare(`
    UPDATE tickets SET status = 'open', close_req_reason = NULL WHERE id = ?
  `).run(ticketId);
}

// ── Message helpers ───────────────────────────────────────────────────────────

async function fetchAllMessages(channel) {
  const messages = [];
  let lastId;
  while (messages.length < 200) {
    const opts = { limit: 100 };
    if (lastId) opts.before = lastId;
    const batch = await channel.messages.fetch(opts);
    if (batch.size === 0) break;
    messages.push(...batch.values());
    lastId = batch.last().id;
    if (batch.size < 100) break;
  }
  return messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function buildTranscript(ticket, messages) {
  const openedDate = new Date(ticket.openedAt).toLocaleString();
  const closedDate = new Date().toLocaleString();
  const lines = [
    '═══════════════════════════════════════',
    'HowToERLC Support — Ticket Transcript',
    `Ticket:   ${ticket.id}`,
    `Subject:  ${ticket.subject}`,
    `Opened:   ${openedDate}`,
    `Closed:   ${closedDate}`,
    `User:     ${ticket.username} (${ticket.userId})`,
    `Staff:    ${ticket.claimedBy || 'Unclaimed'}`,
    ticket.closeReason ? `Reason:   ${ticket.closeReason}` : null,
    '═══════════════════════════════════════',
    '',
    ...messages.map(m =>
      `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.content || '[embed/attachment]'}`
    ),
  ].filter(l => l !== null);
  return lines.join('\n');
}

async function postTranscript(guild, ticket, messages, closedBy, closeReason) {
  const transcriptChannel = guild.channels.cache.get(config.channels.ticketTranscripts);
  if (!transcriptChannel) return;

  const transcriptText = buildTranscript(ticket, messages);
  const attachment = new AttachmentBuilder(Buffer.from(transcriptText), { name: `${ticket.id}.txt` });

  const fields = [
    { name: 'Subject',    value: ticket.subject,                                                     inline: false },
    { name: 'Opened By', value: `<@${ticket.userId}> (${ticket.username})`,                          inline: true  },
    { name: 'Opened At', value: `<t:${Math.floor(new Date(ticket.openedAt).getTime() / 1000)}:F>`,   inline: true  },
    { name: 'Closed By', value: closedBy,                                                            inline: true  },
    { name: 'Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`,                            inline: true  },
    { name: 'Messages',  value: `${messages.length} messages captured`,                              inline: true  },
  ];
  if (closeReason) fields.push({ name: 'Reason', value: closeReason, inline: false });

  const embed = new EmbedBuilder()
    .setColor(config.colors.info)
    .setTitle(`Ticket Transcript — #${String(ticket.number).padStart(4, '0')}`)
    .addFields(fields)
    .setTimestamp();

  await transcriptChannel.send({ embeds: [embed], files: [attachment] }).catch(() => {});
}

// ── Core ticket actions ───────────────────────────────────────────────────────

async function closeTicket(interaction, client, reason) {
  const ticket = getOpenTicketByChannel(interaction.channel.id);

  if (!ticket) {
    const msg = { content: 'No open ticket found in this channel.', flags: MessageFlags.Ephemeral };
    return interaction.replied || interaction.deferred
      ? interaction.followUp(msg)
      : interaction.reply(msg);
  }

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const isStaff = member && (
    member.roles.cache.has(config.roles.staff) ||
    member.roles.cache.has(config.roles.admin) ||
    member.permissions.has('ManageChannels')
  );
  if (!isStaff && ticket.userId !== interaction.user.id) {
    const msg = { content: 'Only the ticket creator or staff can close this ticket.', flags: MessageFlags.Ephemeral };
    return interaction.replied || interaction.deferred
      ? interaction.followUp(msg)
      : interaction.reply(msg);
  }

  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply({ content: 'Closing ticket, please wait...' });
  }

  const messages = await fetchAllMessages(interaction.channel).catch(() => []);
  const now = new Date().toISOString();

  setTicketClosed(ticket.id, interaction.user.tag, reason || null, now);
  const closedTicket = { ...ticket, closeReason: reason || null };

  await postTranscript(interaction.guild, closedTicket, messages, interaction.user.tag, reason);

  try {
    const creator = await client.users.fetch(ticket.userId);
    const dmFields = [
      { name: 'Ticket',    value: ticket.id,                                                          inline: true },
      { name: 'Subject',   value: ticket.subject,                                                     inline: true },
      { name: 'Opened',    value: `<t:${Math.floor(new Date(ticket.openedAt).getTime() / 1000)}:R>`,  inline: true },
      { name: 'Closed By', value: interaction.user.tag,                                               inline: true },
      { name: 'Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`,                           inline: true },
    ];
    if (reason) dmFields.push({ name: 'Reason', value: reason, inline: false });

    const dmEmbed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('Your Ticket Has Been Closed')
      .addFields(dmFields)
      .setTimestamp();
    await creator.send({ embeds: [dmEmbed] });
  } catch {
    // DMs disabled
  }

  await interaction.channel.send(
    `Ticket closed by **${interaction.user.tag}**${reason ? ` — ${reason}` : ''}. This channel will be deleted in 10 seconds.`
  ).catch(() => {});

  setTimeout(() => interaction.channel.delete().catch(() => {}), 10_000);
}

async function requestCloseTicket(interaction, reason) {
  const ticket = getOpenTicketByChannel(interaction.channel.id);

  if (!ticket) {
    return interaction.reply({ content: 'No open ticket found in this channel.', flags: MessageFlags.Ephemeral });
  }

  if (ticket.status === 'close_requested') {
    return interaction.reply({ content: 'A close request is already pending for this ticket.', flags: MessageFlags.Ephemeral });
  }

  if (ticket.userId !== interaction.user.id) {
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    const isStaff = member && (
      member.roles.cache.has(config.roles.staff) ||
      member.roles.cache.has(config.roles.admin) ||
      member.permissions.has('ManageChannels')
    );
    if (!isStaff) {
      return interaction.reply({ content: 'Only the ticket creator or staff can request to close this ticket.', flags: MessageFlags.Ephemeral });
    }
  }

  setCloseRequested(ticket.id, reason);

  const embed = new EmbedBuilder()
    .setColor(config.colors.warning)
    .setTitle('Close Requested')
    .setDescription(`**<@${interaction.user.id}>** has requested this ticket be closed.`)
    .addFields({ name: 'Reason', value: reason, inline: false })
    .setTimestamp();

  const approveBtn = new ButtonBuilder()
    .setCustomId('ticket:approve_close')
    .setLabel('Approve Close')
    .setStyle(ButtonStyle.Danger);

  const denyBtn = new ButtonBuilder()
    .setCustomId('ticket:deny_close')
    .setLabel('Deny')
    .setStyle(ButtonStyle.Secondary);

  await interaction.channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(approveBtn, denyBtn)],
  });

  await interaction.reply({ content: 'Your close request has been submitted. Staff will review it shortly.', flags: MessageFlags.Ephemeral });
}

async function approveCloseRequest(interaction, client) {
  const ticket = getOpenTicketByChannel(interaction.channel.id);

  if (!ticket || ticket.status !== 'close_requested') {
    return interaction.reply({ content: 'No pending close request found for this ticket.', flags: MessageFlags.Ephemeral });
  }

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const isStaff = member && (
    member.roles.cache.has(config.roles.staff) ||
    member.roles.cache.has(config.roles.admin) ||
    member.permissions.has('ManageChannels')
  );
  if (!isStaff) {
    return interaction.reply({ content: 'Only staff can approve close requests.', flags: MessageFlags.Ephemeral });
  }

  await interaction.update({ components: [] });
  await closeTicket(interaction, client, ticket.closeReqReason);
}

async function denyCloseRequest(interaction) {
  const ticket = getOpenTicketByChannel(interaction.channel.id);

  if (!ticket || ticket.status !== 'close_requested') {
    return interaction.reply({ content: 'No pending close request found.', flags: MessageFlags.Ephemeral });
  }

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const isStaff = member && (
    member.roles.cache.has(config.roles.staff) ||
    member.roles.cache.has(config.roles.admin) ||
    member.permissions.has('ManageChannels')
  );
  if (!isStaff) {
    return interaction.reply({ content: 'Only staff can deny close requests.', flags: MessageFlags.Ephemeral });
  }

  clearCloseRequest(ticket.id);

  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('Close Request Denied')
        .setDescription(`**${interaction.user.tag}** denied the close request.`)
        .setTimestamp(),
    ],
    components: [],
  });
}

async function claimTicket(interaction, client) {
  const ticket = getOpenTicketByChannel(interaction.channel.id);

  if (!ticket) {
    return interaction.reply({ content: 'No open ticket found in this channel.', flags: MessageFlags.Ephemeral });
  }

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const isStaff = member && (
    member.roles.cache.has(config.roles.staff) ||
    member.roles.cache.has(config.roles.admin) ||
    member.permissions.has('ManageChannels')
  );

  if (!isStaff) {
    return interaction.reply({ content: 'Only staff can claim tickets.', flags: MessageFlags.Ephemeral });
  }

  if (ticket.claimedBy) {
    return interaction.reply({
      content: `This ticket is already claimed by <@${ticket.claimedBy}>.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const now = new Date().toISOString();
  setTicketClaimed(ticket.id, interaction.user.id, now);

  await interaction.channel.permissionOverwrites.edit(config.roles.staff, {
    ViewChannel: false,
  }).catch(() => {});
  await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
    ViewChannel:        true,
    SendMessages:       true,
    AttachFiles:        true,
    ReadMessageHistory: true,
    ManageMessages:     true,
  }).catch(() => {});

  const msgs = await interaction.channel.messages.fetch({ limit: 20 }).catch(() => null);
  if (msgs) {
    const originalMsg = msgs
      .filter(m => m.author.id === interaction.client.user.id && m.embeds.length > 0)
      .last();
    if (originalMsg) {
      const updatedEmbed = EmbedBuilder.from(originalMsg.embeds[0])
        .setColor(config.colors.info)
        .addFields({
          name: 'Claimed By',
          value: `<@${interaction.user.id}> at <t:${Math.floor(Date.now() / 1000)}:R>`,
          inline: false,
        });
      await originalMsg.edit({ embeds: [updatedEmbed] }).catch(() => {});
    }
  }

  await interaction.reply({
    content: `**${interaction.user.tag}** has claimed this ticket and will assist you shortly.`,
  });
}

module.exports = {
  getNextTicketNumber,
  formatTicketId,
  getOpenTicketByChannel,
  getOpenTicketByUser,
  createTicket,
  setTicketClaimed,
  setTicketClosed,
  setCloseRequested,
  clearCloseRequest,
  fetchAllMessages,
  buildTranscript,
  postTranscript,
  closeTicket,
  requestCloseTicket,
  approveCloseRequest,
  denyCloseRequest,
  claimTicket,
};
