const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');
const { db, nextSugId } = require('../utils/appDb');
const config = require('../config.json');

const SUG_COLOR = 0x5865F2;

// ── suggest_modal submit → create suggestion ──────────────────────────────────

async function handleSuggestModal(interaction, client) {
  const title    = interaction.fields.getTextInputValue('sug_title').trim();
  const category = interaction.fields.getTextInputValue('sug_category').trim();
  const details  = interaction.fields.getTextInputValue('sug_details').trim();

  // Second rate-limit guard (24 hours / 3 suggestions)
  const cutoff = Math.floor(Date.now() / 1000) - 86400;
  const recentCount = db.prepare(
    'SELECT COUNT(*) as count FROM suggestions WHERE user_id = ? AND submitted_at > ?'
  ).get(interaction.user.id, cutoff).count;
  if (recentCount >= 3) {
    return interaction.reply({
      content: "<:Cancel:1494830662581092482> You've reached the suggestion limit for today. Try again tomorrow.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const sugId = nextSugId();
  const now = Math.floor(Date.now() / 1000);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    db.prepare(`
      INSERT INTO suggestions (id, user_id, username, title, category, details, status, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(sugId, interaction.user.id, interaction.user.tag, title, category, details, now);

    // Create forum thread
    const forumChannel = await client.channels.fetch(config.channels.suggestions).catch(() => null);
    let threadId = null;

    if (forumChannel) {
      const forumEmbed = new EmbedBuilder()
        .setColor(SUG_COLOR)
        .setTitle(title)
        .addFields(
          { name: 'Category',      value: category, inline: true },
          { name: 'Suggestion ID', value: sugId,    inline: true },
          { name: 'Status',        value: '<:Dot:1496643767585865818> Pending', inline: true },
          { name: 'Submitted By',  value: `<@${interaction.user.id}> (${interaction.user.id})`, inline: false },
          { name: 'Details',       value: details,  inline: false },
        )
        .setTimestamp(now * 1000);

      const thread = await forumChannel.threads.create({
        name: `[${sugId}] ${title}`.slice(0, 100),
        message: { embeds: [forumEmbed] },
      });
      threadId = thread.id;

      // Add vote reactions to starter message
      const starter = await thread.fetchStarterMessage().catch(() => null);
      if (starter) {
        await starter.react('⬆️').catch(() => {});
        await starter.react('⬇️').catch(() => {});
      }
    }

    // Post to approval channel
    const approvalChannel = await client.channels.fetch(config.channels.suggestionApproval).catch(() => null);
    let approvalMsgId = null;

    if (approvalChannel) {
      const approvalEmbed = new EmbedBuilder()
        .setColor(SUG_COLOR)
        .setTitle(`${sugId} — ${title}`)
        .addFields(
          { name: 'Category',     value: category, inline: true },
          { name: 'Submitted By', value: `<@${interaction.user.id}> (${interaction.user.id})`, inline: true },
          { name: 'Details',      value: details,  inline: false },
        )
        .setTimestamp(now * 1000);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`sug_approve:${sugId}`)
          .setLabel('Approve')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`sug_deny:${sugId}`)
          .setLabel('Deny')
          .setStyle(ButtonStyle.Danger),
      );

      const approvalMsg = await approvalChannel.send({ embeds: [approvalEmbed], components: [row] });
      approvalMsgId = approvalMsg.id;
    }

    db.prepare('UPDATE suggestions SET thread_id = ?, approval_msg_id = ? WHERE id = ?')
      .run(threadId, approvalMsgId, sugId);

    await interaction.editReply({
      content: `<:Check:1494830681484824616> Suggestion submitted! ID: **${sugId}**. Check <#${config.channels.suggestions}> to see it.`,
    });
  } catch (err) {
    console.error('[SugHandler] Modal submit error:', err);
    await interaction.editReply({
      content: '<:Cancel:1494830662581092482> Something went wrong submitting your suggestion. Please try again.',
    });
  }
}

// ── Shared approve/deny helper ────────────────────────────────────────────────

async function reviewSuggestion(interaction, client, sugId, approved) {
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const isStaff = member && (
    member.roles.cache.has(config.roles.staff) ||
    member.roles.cache.has(config.roles.admin) ||
    member.permissions.has('ManageGuild')
  );
  if (!isStaff) {
    return interaction.reply({
      content: '<:Cancel:1494830662581092482> Only staff can review suggestions.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const sug = db.prepare('SELECT * FROM suggestions WHERE id = ?').get(sugId);
  if (!sug || sug.status !== 'pending') {
    return interaction.reply({
      content: '<:Cancel:1494830662581092482> Suggestion not found or already reviewed.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const now = Math.floor(Date.now() / 1000);
  const newStatus = approved ? 'approved' : 'denied';
  db.prepare('UPDATE suggestions SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?')
    .run(newStatus, interaction.user.id, now, sugId);

  const statusColor   = approved ? 0x57F287 : 0xED4245;
  const statusLabel   = approved
    ? `<:Check:1494830681484824616> Approved`
    : `<:Cancel:1494830662581092482> Denied`;
  const titlePrefix   = approved ? '<:Check:1494830681484824616>' : '<:Cancel:1494830662581092482>';

  // Disable approval channel buttons + update embed
  const updatedApproval = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(statusColor)
    .setTitle(`${titlePrefix} ${sug.id} — ${sug.title}`);

  await interaction.update({
    embeds: [updatedApproval],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`sug_approve:${sugId}`)
          .setLabel('Approve')
          .setStyle(ButtonStyle.Success)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`sug_deny:${sugId}`)
          .setLabel('Deny')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true),
      ),
    ],
  });

  // Edit forum thread embed
  if (sug.thread_id) {
    try {
      const thread = await client.channels.fetch(sug.thread_id).catch(() => null);
      if (thread) {
        const starter = await thread.fetchStarterMessage().catch(() => null);
        if (starter?.embeds[0]) {
          const fields = starter.embeds[0].fields.map(f =>
            f.name === 'Status'
              ? { name: 'Status', value: statusLabel, inline: f.inline }
              : f
          );
          fields.push({ name: 'Reviewed By', value: `<@${interaction.user.id}>`, inline: true });
          await starter.edit({
            embeds: [EmbedBuilder.from(starter.embeds[0]).setColor(statusColor).setFields(fields)],
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[SugHandler] Forum edit error:', err);
    }
  }

  // DM author
  try {
    const user = await client.users.fetch(sug.user_id);
    await user.send({
      embeds: [
        new EmbedBuilder()
          .setColor(statusColor)
          .setTitle(`${titlePrefix} Suggestion ${approved ? 'Approved' : 'Denied'}`)
          .setDescription(`Your suggestion **"${sug.title}"** (**${sug.id}**) has been ${newStatus} by the staff team.`)
          .setTimestamp(),
      ],
    });
  } catch { /* DMs disabled */ }
}

async function handleSugApprove(interaction, client) {
  return reviewSuggestion(interaction, client, interaction.customId.split(':')[1], true);
}

async function handleSugDeny(interaction, client) {
  return reviewSuggestion(interaction, client, interaction.customId.split(':')[1], false);
}

module.exports = { handleSuggestModal, handleSugApprove, handleSugDeny };
