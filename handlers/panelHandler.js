// handlers/panelHandler.js — interactions for the redesigned panels
// (customId prefix "panelsel"). Every reply is ephemeral; every path is
// wrapped so a failed reply or missing channel never crashes the bot.
const {
  ContainerBuilder, TextDisplayBuilder,
  ActionRowBuilder, StringSelectMenuBuilder,
  MessageFlags, resolveColor,
} = require('discord.js');
const config = require('../config.json');
const { emojiObject } = require('../utils/appEmojis');
const content = require('../panels/panelContent');

const ACCENT = resolveColor(config.colors.primary || '#4ade80');
const EPHEMERAL_V2 = MessageFlags.Ephemeral | MessageFlags.IsComponentsV2;

async function safeReply(interaction, payload) {
  try {
    if (interaction.replied || interaction.deferred) return await interaction.followUp(payload);
    return await interaction.reply(payload);
  } catch (err) {
    console.warn('[PanelHandler] Reply failed:', err.message);
  }
}

/** Ephemeral V2 card used for handbook sections. */
function sectionCard(title, body) {
  // Heading sits directly above its content, no blank line (the heading
  // markdown already renders its own spacing)
  const text = `${title}\n${body}`.slice(0, 3800);
  return {
    components: [
      new ContainerBuilder()
        .setAccentColor(ACCENT)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text)),
    ],
    flags: EPHEMERAL_V2,
  };
}

// ── Get Started: jump to a forum ──────────────────────────────────────────────
async function handleForumJump(interaction) {
  const key = interaction.values[0];
  const forum = content.FORUMS.find(f => f.key === key);
  const channelId = config.channels[key];

  if (!channelId) {
    return safeReply(interaction, {
      content: `The **${forum ? forum.label : key}** forum is not set up yet. Check back soon.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  return safeReply(interaction, {
    content: `${forum ? forum.label : 'Forum'}: <#${channelId}>\n${content.channelUrl(channelId)}`,
    flags: MessageFlags.Ephemeral,
  });
}

// ── Handbook sections (management / staff / pr) ───────────────────────────────
async function handleHandbookSection(interaction, handbook) {
  const section = handbook.sections[interaction.values[0]];
  if (!section) {
    return safeReply(interaction, { content: 'Unknown section.', flags: MessageFlags.Ephemeral });
  }
  return safeReply(interaction, sectionCard(section.title, section.content));
}

// ── Dashboard: Notification Roles button → ephemeral roles menu ───────────────
// Reuses the existing "rolepanel:notifications" select handler unchanged.
async function handleRolesButton(interaction) {
  const options = [
    { label: 'Change Log',    description: 'Get notified about change logs',      value: config.roles.notifications.updates || 'updates',           emojiName: 'Bell',      emojiFallback: '🔔' },
    { label: 'New Resources', description: 'Get notified when resources drop',    value: config.roles.notifications.resources || 'resources',       emojiName: 'Book',      emojiFallback: '📚' },
    { label: 'Announcements', description: 'Get notified about announcements',    value: config.roles.notifications.announcements || 'announcements', emojiName: 'Megaphone', emojiFallback: '📣' },
  ].map(o => {
    const built = { label: o.label, description: o.description, value: o.value };
    const emoji = emojiObject(o.emojiName, o.emojiFallback);
    if (emoji) built.emoji = emoji;
    return built;
  });

  const menu = new StringSelectMenuBuilder()
    .setCustomId('rolepanel:notifications')
    .setPlaceholder('Choose your notification roles')
    .setMinValues(0).setMaxValues(options.length)
    .addOptions(options);

  return safeReply(interaction, {
    content: 'Pick the notifications you want. Selecting toggles the role on, deselecting removes it.',
    components: [new ActionRowBuilder().addComponents(menu)],
    flags: MessageFlags.Ephemeral,
  });
}

// ── Router (customId prefix "panelsel") ───────────────────────────────────────
async function handlePanelInteraction(interaction) {
  try {
    const action = interaction.customId.split(':')[1];

    if (interaction.isStringSelectMenu()) {
      if (action === 'jump')    return await handleForumJump(interaction);
      if (action === 'mgmt')    return await handleHandbookSection(interaction, content.managementHandbook());
      if (action === 'staffhb') return await handleHandbookSection(interaction, content.staffHandbook());
      if (action === 'prhb')    return await handleHandbookSection(interaction, content.prHandbook());
    }

    if (interaction.isButton()) {
      if (action === 'roles') return await handleRolesButton(interaction);
    }
  } catch (err) {
    console.error('[PanelHandler] Error:', err);
    await safeReply(interaction, { content: 'Something went wrong opening that. Try again.', flags: MessageFlags.Ephemeral });
  }
}

module.exports = { handlePanelInteraction };
