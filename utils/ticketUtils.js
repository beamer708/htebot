const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

const ticketsPath = path.join(__dirname, '..', 'data', 'tickets.json');

function readTickets() { try { return JSON.parse(fs.readFileSync(ticketsPath, 'utf8')); } catch { return {}; } }
function writeTickets(data) { fs.writeFileSync(ticketsPath, JSON.stringify(data, null, 2)); }

function getNextTicketNumber(ticketsData) {
  const nums = Object.values(ticketsData).map(t => t.number || 0).filter(n => n > 0);
  return nums.length > 0 ? Math.max(...nums) + 1 : 1;
}
function formatTicketId(n) { return `ticket-${String(n).padStart(4, '0')}`; }

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
    '═══════════════════════════════════════',
    '',
    ...messages.map(m =>
      `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.content || '[embed/attachment]'}`
    ),
  ];
  return lines.join('\n');
}

async function postTranscript(guild, ticket, messages, closedBy) {
  const transcriptChannel = guild.channels.cache.get(config.channels.ticketTranscripts);
  if (!transcriptChannel) return;

  const transcriptText = buildTranscript(ticket, messages);
  const attachment = new AttachmentBuilder(Buffer.from(transcriptText), { name: `${ticket.id}.txt` });

  const embed = new EmbedBuilder()
    .setColor(config.colors.info)
    .setTitle(`📄 Ticket Transcript — #${String(ticket.number).padStart(4, '0')}`)
    .addFields(
      { name: 'Subject',    value: ticket.subject,                                                     inline: false },
      { name: 'Opened By', value: `<@${ticket.userId}> (${ticket.username})`,                          inline: true  },
      { name: 'Opened At', value: `<t:${Math.floor(new Date(ticket.openedAt).getTime() / 1000)}:F>`,   inline: true  },
      { name: 'Closed By', value: closedBy,                                                            inline: true  },
      { name: 'Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`,                            inline: true  },
      { name: 'Messages',  value: `${messages.length} messages captured`,                              inline: true  },
    )
    .setTimestamp();

  await transcriptChannel.send({ embeds: [embed], files: [attachment] }).catch(() => {});
}

async function closeTicket(interaction, client) {
  const ticketsData = readTickets();
  const ticket = Object.values(ticketsData).find(
    t => t.channelId === interaction.channel.id && t.status !== 'closed'
  );

  if (!ticket) {
    const msg = { content: '❌ No open ticket found in this channel.', ephemeral: true };
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
    const msg = { content: '❌ Only the ticket creator or staff can close this ticket.', ephemeral: true };
    return interaction.replied || interaction.deferred
      ? interaction.followUp(msg)
      : interaction.reply(msg);
  }

  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply({ content: '🔒 Closing ticket, please wait...' });
  }

  const messages = await fetchAllMessages(interaction.channel).catch(() => []);

  const now = new Date().toISOString();
  ticketsData[ticket.id].status = 'closed';
  ticketsData[ticket.id].closedAt = now;
  ticketsData[ticket.id].closedBy = interaction.user.tag;
  writeTickets(ticketsData);

  await postTranscript(interaction.guild, ticket, messages, interaction.user.tag);

  // DM ticket creator
  try {
    const creator = await client.users.fetch(ticket.userId);
    const dmEmbed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('🎫 Your Ticket Has Been Closed')
      .addFields(
        { name: 'Ticket',    value: ticket.id,                                                          inline: true },
        { name: 'Subject',   value: ticket.subject,                                                     inline: true },
        { name: 'Opened',    value: `<t:${Math.floor(new Date(ticket.openedAt).getTime() / 1000)}:R>`, inline: true },
        { name: 'Closed By', value: interaction.user.tag,                                               inline: true },
        { name: 'Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`,                          inline: true },
      )
      .setFooter({ text: 'HowToERLC Support' })
      .setTimestamp();
    await creator.send({ embeds: [dmEmbed] });
  } catch {
    // DMs disabled — ignore
  }

  await interaction.channel.send(
    `🔒 Ticket closed by **${interaction.user.tag}**. This channel will be deleted in 10 seconds.`
  ).catch(() => {});

  setTimeout(() => interaction.channel.delete().catch(() => {}), 10_000);
}

async function claimTicket(interaction, client) {
  const ticketsData = readTickets();
  const ticket = Object.values(ticketsData).find(
    t => t.channelId === interaction.channel.id && t.status !== 'closed'
  );

  if (!ticket) {
    return interaction.reply({ content: '❌ No open ticket found in this channel.', ephemeral: true });
  }

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const isStaff = member && (
    member.roles.cache.has(config.roles.staff) ||
    member.roles.cache.has(config.roles.admin) ||
    member.permissions.has('ManageChannels')
  );

  if (!isStaff) {
    return interaction.reply({ content: '❌ Only staff can claim tickets.', ephemeral: true });
  }

  if (ticket.claimedBy) {
    return interaction.reply({
      content: `❌ This ticket is already claimed by <@${ticket.claimedBy}>.`,
      ephemeral: true,
    });
  }

  const now = new Date().toISOString();
  ticketsData[ticket.id].status = 'claimed';
  ticketsData[ticket.id].claimedBy = interaction.user.id;
  ticketsData[ticket.id].claimedAt = now;
  writeTickets(ticketsData);

  // Lock other staff out, give claimer explicit access
  await interaction.channel.permissionOverwrites.edit(config.roles.staff, {
    ViewChannel: false,
  }).catch(() => {});
  await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
    ViewChannel:      true,
    SendMessages:     true,
    AttachFiles:      true,
    ReadMessageHistory: true,
    ManageMessages:   true,
  }).catch(() => {});

  // Edit the original ticket embed (first bot embed message in the channel)
  const msgs = await interaction.channel.messages.fetch({ limit: 20 }).catch(() => null);
  if (msgs) {
    const originalMsg = msgs
      .filter(m => m.author.id === interaction.client.user.id && m.embeds.length > 0)
      .last();
    if (originalMsg) {
      const updatedEmbed = EmbedBuilder.from(originalMsg.embeds[0])
        .setColor(config.colors.info)
        .addFields({
          name: '🙋 Claimed By',
          value: `<@${interaction.user.id}> at <t:${Math.floor(Date.now() / 1000)}:R>`,
          inline: false,
        });
      await originalMsg.edit({ embeds: [updatedEmbed] }).catch(() => {});
    }
  }

  await interaction.reply({
    content: `🙋 **${interaction.user.tag}** has claimed this ticket and will assist you shortly.`,
  });
}

module.exports = { readTickets, writeTickets, getNextTicketNumber, formatTicketId, fetchAllMessages, buildTranscript, postTranscript, closeTicket, claimTicket };
