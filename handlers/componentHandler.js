const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

const dataPath = (file) => path.join(__dirname, '..', 'data', file);

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(dataPath(file), 'utf8'));
  } catch {
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(dataPath(file), JSON.stringify(data, null, 2));
}

async function dmUser(client, userId, embed) {
  try {
    const user = await client.users.fetch(userId);
    await user.send({ embeds: [embed] });
  } catch {
    // User has DMs disabled — silently ignore
  }
}

async function handleApplicationButton(interaction, client) {
  const [, action, submissionId] = interaction.customId.split(':');
  const applications = readJSON('applications.json');
  const idx = applications.findIndex(a => a.id === submissionId);
  if (idx === -1) return interaction.reply({ content: 'Application not found.', ephemeral: true });

  const app = applications[idx];
  const staffTag = interaction.user.tag;
  const accepted = action === 'accept';

  applications[idx].status = accepted ? 'accepted' : 'denied';
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

async function handleSuggestionButton(interaction, client) {
  const [, action, submissionId] = interaction.customId.split(':');
  const suggestions = readJSON('suggestions.json');
  const idx = suggestions.findIndex(s => s.id === submissionId);
  if (idx === -1) return interaction.reply({ content: 'Suggestion not found.', ephemeral: true });

  const suggestion = suggestions[idx];

  if (action === 'upvote' || action === 'downvote') {
    const userId = interaction.user.id;
    if (!suggestions[idx].votes) suggestions[idx].votes = { up: [], down: [] };

    const upIdx = suggestions[idx].votes.up.indexOf(userId);
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

    const up = suggestions[idx].votes.up.length;
    const down = suggestions[idx].votes.down.length;

    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
    const fields = updatedEmbed.data.fields || [];
    const voteFieldIdx = fields.findIndex(f => f.name === '📊 Votes');
    if (voteFieldIdx !== -1) {
      fields[voteFieldIdx].value = `👍 ${up}  •  👎 ${down}`;
    } else {
      fields.push({ name: '📊 Votes', value: `👍 ${up}  •  👎 ${down}`, inline: false });
    }

    return interaction.update({ embeds: [updatedEmbed] });
  }

  // Approve or decline (staff only)
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const isStaff = member && (
    member.roles.cache.has(config.roles.staff) ||
    member.roles.cache.has(config.roles.admin) ||
    member.permissions.has('ManageGuild')
  );
  if (!isStaff) return interaction.reply({ content: 'Only staff can approve or decline suggestions.', ephemeral: true });

  const accepted = action === 'approve';
  const staffTag = interaction.user.tag;

  suggestions[idx].status = accepted ? 'approved' : 'declined';
  suggestions[idx].reviewedBy = staffTag;
  suggestions[idx].reviewedAt = new Date().toISOString();
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
  const accepted = action === 'approve';
  const staffTag = interaction.user.tag;

  partnerships[idx].status = accepted ? 'approved' : 'denied';
  partnerships[idx].reviewedBy = staffTag;
  partnerships[idx].reviewedAt = new Date().toISOString();
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

async function handleTicketButton(interaction, client) {
  const [, action] = interaction.customId.split(':');

  if (action === 'create') {
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
    const modal = new ModalBuilder()
      .setCustomId('ticket_modal')
      .setTitle('Create a Support Ticket');

    const reasonInput = new TextInputBuilder()
      .setCustomId('ticket_reason')
      .setLabel('What do you need help with?')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Describe your issue in detail...')
      .setRequired(true)
      .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    return interaction.showModal(modal);
  }

  if (action === 'close') {
    const ticketsData = JSON.parse(fs.readFileSync(dataPath('tickets.json'), 'utf8') || '{}');
    const ticket = Object.values(ticketsData).find(t => t.channelId === interaction.channel.id && t.status === 'open');

    if (!ticket) return interaction.reply({ content: 'No open ticket found for this channel.', ephemeral: true });

    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    const isStaff = member && (
      member.roles.cache.has(config.roles.staff) ||
      member.roles.cache.has(config.roles.admin) ||
      member.permissions.has('ManageChannels')
    );
    const isOwner = ticket.userId === interaction.user.id;

    if (!isStaff && !isOwner) {
      return interaction.reply({ content: 'Only the ticket creator or staff can close this ticket.', ephemeral: true });
    }

    await interaction.reply({ content: '🔒 Closing ticket in 5 seconds...' });

    ticketsData[ticket.id].status = 'closed';
    ticketsData[ticket.id].closedAt = new Date().toISOString();
    ticketsData[ticket.id].closedBy = interaction.user.tag;
    fs.writeFileSync(dataPath('tickets.json'), JSON.stringify(ticketsData, null, 2));

    const transcriptChannel = interaction.guild.channels.cache.get(config.channels.ticketTranscripts);
    if (transcriptChannel) {
      const transcriptEmbed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle('🎫 Ticket Closed')
        .addFields(
          { name: 'Ticket ID', value: ticket.id, inline: true },
          { name: 'Opened By', value: `<@${ticket.userId}>`, inline: true },
          { name: 'Closed By', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: ticket.reason || 'No reason provided', inline: false },
        )
        .setTimestamp();
      await transcriptChannel.send({ embeds: [transcriptEmbed] });
    }

    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }
}

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

async function handleTicketModal(interaction, client) {
  const reason = interaction.fields.getTextInputValue('ticket_reason');
  const guild = interaction.guild;
  const user = interaction.user;

  const ticketsData = JSON.parse(fs.readFileSync(dataPath('tickets.json'), 'utf8') || '{}');

  const existing = Object.values(ticketsData).find(t => t.userId === user.id && t.status === 'open');
  if (existing) {
    return interaction.reply({
      content: `You already have an open ticket: <#${existing.channelId}>`,
      ephemeral: true,
    });
  }

  const ticketId = `ticket-${Date.now()}`;
  const { PermissionFlagsBits } = require('discord.js');

  const channel = await guild.channels.create({
    name: `ticket-${user.username}`,
    parent: config.categories.tickets || null,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      { id: config.roles.staff, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
    ],
  });

  ticketsData[ticketId] = {
    id: ticketId,
    channelId: channel.id,
    userId: user.id,
    username: user.tag,
    reason,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(dataPath('tickets.json'), JSON.stringify(ticketsData, null, 2));

  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
  const ticketEmbed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🎫 Support Ticket')
    .setDescription(`Hello <@${user.id}>! A staff member will be with you shortly.\n\n**Your reason:** ${reason}`)
    .setFooter({ text: 'HowToERLC Support • Use the button below to close this ticket' })
    .setTimestamp();

  const closeBtn = new ButtonBuilder()
    .setCustomId('ticket:close')
    .setLabel('🔒 Close Ticket')
    .setStyle(ButtonStyle.Danger);

  await channel.send({
    content: `<@${user.id}> <@&${config.roles.staff}>`,
    embeds: [ticketEmbed],
    components: [new ActionRowBuilder().addComponents(closeBtn)],
  });

  await interaction.reply({ content: `✅ Your ticket has been created: ${channel}`, ephemeral: true });
}

module.exports = async (interaction, client) => {
  try {
    if (interaction.isButton()) {
      const prefix = interaction.customId.split(':')[0];
      if (prefix === 'app') return handleApplicationButton(interaction, client);
      if (prefix === 'suggestion') return handleSuggestionButton(interaction, client);
      if (prefix === 'partnership') return handlePartnershipButton(interaction, client);
      if (prefix === 'ticket') return handleTicketButton(interaction, client);
      if (prefix === 'role') return handleRolePanelButton(interaction);
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
