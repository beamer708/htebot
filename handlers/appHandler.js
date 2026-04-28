const {
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder, MessageFlags,
} = require('discord.js');
const { db, nextAppId } = require('../utils/appDb');
const config = require('../config.json');

const APP_COLOR = 0x52D973;
const RATE_LIMIT_DAYS = 7;

// ── Staff Apply button → open modal ──────────────────────────────────────────

async function handleStaffApplyButton(interaction) {
  const cutoff = Math.floor(Date.now() / 1000) - RATE_LIMIT_DAYS * 86400;
  const recent = db.prepare(
    "SELECT id FROM applications WHERE user_id = ? AND submitted_at > ? ORDER BY submitted_at DESC LIMIT 1"
  ).get(interaction.user.id, cutoff);

  if (recent) {
    return interaction.reply({
      content: `<:Cancel:1494830662581092482> You already submitted an application (ID: **${recent.id}**). Please wait before applying again.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId('staff_apply_modal')
    .setTitle('Staff Application');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('app_age')
        .setLabel('Age')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. 17')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('app_timezone')
        .setLabel('Timezone')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. EST / UTC+0')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('app_reason')
        .setLabel('Why do you want to join?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Tell us why you want to join the team.')
        .setMinLength(50)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('app_experience')
        .setLabel('Previous experience')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Any prior moderation, staff, or community experience.')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('app_role')
        .setLabel('Role applying for')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Community Team or Beta Tester')
        .setRequired(true)
    ),
  );

  return interaction.showModal(modal);
}

// ── Modal submit → create application ────────────────────────────────────────

async function handleStaffApplyModal(interaction, client) {
  const age        = interaction.fields.getTextInputValue('app_age').trim();
  const timezone   = interaction.fields.getTextInputValue('app_timezone').trim();
  const reason     = interaction.fields.getTextInputValue('app_reason').trim();
  const experience = interaction.fields.getTextInputValue('app_experience').trim();
  const role       = interaction.fields.getTextInputValue('app_role').trim();

  // Second rate-limit check (guard against race between open and submit)
  const cutoff = Math.floor(Date.now() / 1000) - RATE_LIMIT_DAYS * 86400;
  const recent = db.prepare(
    "SELECT id FROM applications WHERE user_id = ? AND submitted_at > ? ORDER BY submitted_at DESC LIMIT 1"
  ).get(interaction.user.id, cutoff);
  if (recent) {
    return interaction.reply({
      content: `<:Cancel:1494830662581092482> You already submitted an application (ID: **${recent.id}**). Please wait before applying again.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const appId = nextAppId();
  const now = Math.floor(Date.now() / 1000);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    db.prepare(`
      INSERT INTO applications (id, user_id, username, age, timezone, reason, experience, role, status, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(appId, interaction.user.id, interaction.user.tag, age, timezone, reason, experience, role, now);

    // Create forum thread
    const forumChannel = await client.channels.fetch(config.channels.applications).catch(() => null);
    if (forumChannel) {
      const embed = new EmbedBuilder()
        .setColor(APP_COLOR)
        .setTitle(`${appId} — ${interaction.user.tag}`)
        .setDescription(`<@${interaction.user.id}>`)
        .addFields(
          { name: 'Role Applying For', value: role,        inline: true },
          { name: 'Age',               value: age,         inline: true },
          { name: 'Timezone',          value: timezone,    inline: true },
          { name: 'Status',            value: '<:Dot:1496643767585865818> Pending', inline: true },
          { name: 'Application ID',    value: appId,       inline: true },
          { name: 'Why do you want to join?', value: reason,     inline: false },
          { name: 'Previous Experience',      value: experience, inline: false },
        )
        .setTimestamp(now * 1000);

      const reviewRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`app_review:approve:${appId}`)
          .setLabel('Accept')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`app_review:deny:${appId}`)
          .setLabel('Deny')
          .setStyle(ButtonStyle.Danger),
      );

      const thread = await forumChannel.threads.create({
        name: `[${appId}] ${interaction.user.tag} — ${role}`.slice(0, 100),
        message: { embeds: [embed], components: [reviewRow] },
      });

      db.prepare('UPDATE applications SET thread_id = ? WHERE id = ?').run(thread.id, appId);

      // Pin the starter message
      const starter = await thread.fetchStarterMessage().catch(() => null);
      if (starter) await starter.pin().catch(() => {});

      await thread.send(`<@&${config.roles.admin}> New application submitted.`);
    }

    // DM applicant
    await interaction.user.send(
      `Your application has been submitted! Your application ID is **${appId}**. We'll review it and get back to you soon.`
    ).catch(() => {});

    await interaction.editReply({
      content: `<:Check:1494830681484824616> Application submitted! ID: **${appId}**`,
    });
  } catch (err) {
    console.error('[AppHandler] Modal submit error:', err);
    await interaction.editReply({
      content: '<:Cancel:1494830662581092482> Something went wrong submitting your application. Please try again.',
    });
  }
}

// ── /approve APP-XXXX ─────────────────────────────────────────────────────────

async function approveApplication(interaction, client, rawId, reason) {
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const isStaff = member && (
    member.roles.cache.has(config.roles.staff) ||
    member.roles.cache.has(config.roles.admin) ||
    member.permissions.has('ManageGuild')
  );
  if (!isStaff) {
    return interaction.reply({
      content: '<:Cancel:1494830662581092482> Only staff can review applications.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(rawId.toUpperCase());
  if (!app) {
    return interaction.reply({
      content: `<:Cancel:1494830662581092482> No application found with ID **${rawId}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }
  if (app.status !== 'pending') {
    return interaction.reply({
      content: `<:Cancel:1494830662581092482> Application **${app.id}** has already been ${app.status}.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const now = Math.floor(Date.now() / 1000);
  db.prepare('UPDATE applications SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?')
    .run('approved', interaction.user.id, now, app.id);

  // Edit forum thread embed
  if (app.thread_id) {
    try {
      const thread = await client.channels.fetch(app.thread_id).catch(() => null);
      if (thread) {
        const starter = await thread.fetchStarterMessage().catch(() => null);
        if (starter?.embeds[0]) {
          const fields = starter.embeds[0].fields.map(f =>
            f.name === 'Status'
              ? { name: 'Status', value: '<:Check:1494830681484824616> Approved', inline: f.inline }
              : f
          );
          fields.push({ name: 'Reviewed By', value: `<@${interaction.user.id}>`, inline: true });
          if (reason) fields.push({ name: 'Review Note', value: reason, inline: false });
          await starter.edit({
            embeds: [EmbedBuilder.from(starter.embeds[0]).setColor(0x57F287).setFields(fields)],
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[AppHandler] Forum edit error:', err);
    }
  }

  // DM applicant
  try {
    const user = await client.users.fetch(app.user_id);
    const dmEmbed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('<:Check:1494830681484824616> Application Approved')
      .setDescription(`Your staff application (**${app.id}**) for **${app.role}** has been approved! A staff member will reach out with next steps.`)
      .setTimestamp();
    if (reason) dmEmbed.addFields({ name: 'Note', value: reason, inline: false });
    await user.send({ embeds: [dmEmbed] });
  } catch { /* DMs disabled */ }

  await interaction.editReply({
    content: `<:Check:1494830681484824616> Application **${app.id}** approved.`,
  });
}

// ── /deny APP-XXXX ────────────────────────────────────────────────────────────

async function denyApplication(interaction, client, rawId, reason) {
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const isStaff = member && (
    member.roles.cache.has(config.roles.staff) ||
    member.roles.cache.has(config.roles.admin) ||
    member.permissions.has('ManageGuild')
  );
  if (!isStaff) {
    return interaction.reply({
      content: '<:Cancel:1494830662581092482> Only staff can review applications.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(rawId.toUpperCase());
  if (!app) {
    return interaction.reply({
      content: `<:Cancel:1494830662581092482> No application found with ID **${rawId}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }
  if (app.status !== 'pending') {
    return interaction.reply({
      content: `<:Cancel:1494830662581092482> Application **${app.id}** has already been ${app.status}.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const now = Math.floor(Date.now() / 1000);
  db.prepare('UPDATE applications SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?')
    .run('denied', interaction.user.id, now, app.id);

  // Edit forum thread embed
  if (app.thread_id) {
    try {
      const thread = await client.channels.fetch(app.thread_id).catch(() => null);
      if (thread) {
        const starter = await thread.fetchStarterMessage().catch(() => null);
        if (starter?.embeds[0]) {
          const fields = starter.embeds[0].fields.map(f =>
            f.name === 'Status'
              ? { name: 'Status', value: '<:Cancel:1494830662581092482> Denied', inline: f.inline }
              : f
          );
          fields.push({ name: 'Reviewed By', value: `<@${interaction.user.id}>`, inline: true });
          if (reason) fields.push({ name: 'Reason', value: reason, inline: false });
          await starter.edit({
            embeds: [EmbedBuilder.from(starter.embeds[0]).setColor(0xED4245).setFields(fields)],
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[AppHandler] Forum edit error:', err);
    }
  }

  // DM applicant
  try {
    const user = await client.users.fetch(app.user_id);
    const dmEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('<:Cancel:1494830662581092482> Application Denied')
      .setDescription(`Your staff application (**${app.id}**) for **${app.role}** has been denied.`)
      .setTimestamp();
    if (reason) dmEmbed.addFields({ name: 'Reason', value: reason, inline: false });
    await user.send({ embeds: [dmEmbed] });
  } catch { /* DMs disabled */ }

  await interaction.editReply({
    content: `<:Check:1494830681484824616> Application **${app.id}** denied.`,
  });
}

// ── Forum thread Accept / Deny buttons ───────────────────────────────────────

async function handleAppReviewButton(interaction, client) {
  const [, action, appId] = interaction.customId.split(':');

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const isStaff = member && (
    member.roles.cache.has(config.roles.staff) ||
    member.roles.cache.has(config.roles.admin) ||
    member.permissions.has('ManageGuild')
  );
  if (!isStaff) {
    return interaction.reply({
      content: '<:Cancel:1494830662581092482> Only staff can review applications.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(appId);
  if (!app) {
    return interaction.reply({
      content: `<:Cancel:1494830662581092482> Application **${appId}** not found.`,
      flags: MessageFlags.Ephemeral,
    });
  }
  if (app.status !== 'pending') {
    return interaction.reply({
      content: `<:Cancel:1494830662581092482> This application has already been **${app.status}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  if (action === 'approve') {
    const now = Math.floor(Date.now() / 1000);
    db.prepare('UPDATE applications SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?')
      .run('approved', interaction.user.id, now, app.id);

    const fields = interaction.message.embeds[0].fields.map(f =>
      f.name === 'Status'
        ? { name: 'Status', value: '<:Check:1494830681484824616> Approved', inline: f.inline }
        : f
    );
    fields.push({ name: 'Reviewed By', value: `<@${interaction.user.id}>`, inline: true });

    await interaction.update({
      embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setColor(0x57F287).setFields(fields)],
      components: [],
    });

    try {
      const user = await client.users.fetch(app.user_id);
      const dmEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('<:Check:1494830681484824616> Application Approved')
        .setDescription(`Your staff application (**${app.id}**) for **${app.role}** has been approved! A staff member will reach out with next steps.`)
        .setTimestamp();
      await user.send({ embeds: [dmEmbed] });
    } catch { /* DMs disabled */ }

  } else {
    // Show modal for optional deny reason
    const modal = new ModalBuilder()
      .setCustomId(`app_deny_modal:${appId}`)
      .setTitle('Deny Application');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('deny_reason')
          .setLabel('Reason (optional)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setPlaceholder('Provide a reason for denying this application.')
          .setMaxLength(500)
      )
    );

    return interaction.showModal(modal);
  }
}

async function handleAppDenyModal(interaction, client) {
  const appId = interaction.customId.split(':')[1];
  const reason = interaction.fields.getTextInputValue('deny_reason').trim();

  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(appId);
  if (!app || app.status !== 'pending') {
    return interaction.reply({
      content: `<:Cancel:1494830662581092482> Application **${appId}** is no longer pending.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferUpdate();

  const now = Math.floor(Date.now() / 1000);
  db.prepare('UPDATE applications SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?')
    .run('denied', interaction.user.id, now, app.id);

  // Update the forum thread starter message
  if (app.thread_id) {
    try {
      const thread = await client.channels.fetch(app.thread_id).catch(() => null);
      if (thread) {
        const starter = await thread.fetchStarterMessage().catch(() => null);
        if (starter?.embeds[0]) {
          const fields = starter.embeds[0].fields.map(f =>
            f.name === 'Status'
              ? { name: 'Status', value: '<:Cancel:1494830662581092482> Denied', inline: f.inline }
              : f
          );
          fields.push({ name: 'Reviewed By', value: `<@${interaction.user.id}>`, inline: true });
          if (reason) fields.push({ name: 'Reason', value: reason, inline: false });
          await starter.edit({
            embeds: [EmbedBuilder.from(starter.embeds[0]).setColor(0xED4245).setFields(fields)],
            components: [],
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[AppHandler] Forum edit error on deny modal:', err);
    }
  }

  try {
    const user = await client.users.fetch(app.user_id);
    const dmEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('<:Cancel:1494830662581092482> Application Denied')
      .setDescription(`Your staff application (**${app.id}**) for **${app.role}** has been denied.`)
      .setTimestamp();
    if (reason) dmEmbed.addFields({ name: 'Reason', value: reason, inline: false });
    await user.send({ embeds: [dmEmbed] });
  } catch { /* DMs disabled */ }
}

module.exports = {
  handleStaffApplyButton,
  handleStaffApplyModal,
  approveApplication,
  denyApplication,
  handleAppReviewButton,
  handleAppDenyModal,
};
