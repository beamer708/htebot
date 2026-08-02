// handlers/stickyHandler.js — the /sticky control panel (ephemeral Components
// V2) and its toggle buttons (customId prefix "sticky"). Management only.
const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  MessageFlags, PermissionFlagsBits, resolveColor,
} = require('discord.js');
const config = require('../config.json');
const { STICKY_CHANNELS } = require('../utils/stickyContent');
const { enableSticky, disableSticky, isEnabled } = require('../utils/stickyManager');
const { e } = require('../utils/appEmojis');

async function hasManagementAccess(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  return !!member && (
    member.roles.cache.has(config.managementRoleId) ||
    member.permissions.has(PermissionFlagsBits.Administrator)
  );
}

/** Build the ephemeral V2 control panel reflecting current per-channel state. */
function buildStickyPanel() {
  const lines = STICKY_CHANNELS.map(s =>
    `${isEnabled(s.channelId) ? e('toggleright', '🟢') : e('toggleleft', '⚫')} **${s.label}** <#${s.channelId}>`
  );

  const container = new ContainerBuilder()
    .setAccentColor(resolveColor(config.colors.primary || '#4ade80'))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${e('HTELogo', '📌')} Sticky Messages\n` +
        'Toggle the sticky for each channel. Changes apply **immediately**: on posts the sticky now, off deletes it.\n\n' +
        lines.join('\n')
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  // Toggle buttons, up to 4 per row (7 channels → 2 rows)
  const toggleButtons = STICKY_CHANNELS.map(s =>
    new ButtonBuilder()
      .setCustomId(`sticky:toggle:${s.channelId}`)
      .setLabel(s.label)
      .setStyle(isEnabled(s.channelId) ? ButtonStyle.Success : ButtonStyle.Secondary)
  );
  for (let i = 0; i < toggleButtons.length; i += 4) {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(...toggleButtons.slice(i, i + 4))
    );
  }

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('sticky:all:on').setLabel('Enable All').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('sticky:all:off').setLabel('Disable All').setStyle(ButtonStyle.Danger),
    )
  );

  return container;
}

const PANEL_FLAGS = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;

/** Buttons: sticky:toggle:<channelId>, sticky:all:on, sticky:all:off */
async function handleStickyInteraction(interaction, client) {
  try {
    if (!await hasManagementAccess(interaction)) {
      return interaction.reply({ content: 'Only management can manage sticky messages.', flags: MessageFlags.Ephemeral });
    }

    const [, action, arg] = interaction.customId.split(':');

    // Acknowledge immediately; posting/deleting can take a moment
    await interaction.deferUpdate();

    if (action === 'toggle') {
      const entry = STICKY_CHANNELS.find(s => s.channelId === arg);
      if (entry) {
        if (isEnabled(arg)) await disableSticky(client, arg);
        else await enableSticky(client, arg);
      }
    } else if (action === 'all') {
      for (const s of STICKY_CHANNELS) {
        if (arg === 'on') await enableSticky(client, s.channelId);
        else await disableSticky(client, s.channelId);
      }
    }

    // Ephemeral is set at reply time and cannot be re-sent on edit
    await interaction.editReply({ components: [buildStickyPanel()], flags: MessageFlags.IsComponentsV2 });
  } catch (err) {
    console.error('[Sticky] Panel interaction error:', err);
    await interaction.followUp({ content: 'Something went wrong updating stickies. Check the logs.', flags: MessageFlags.Ephemeral }).catch(() => {});
  }
}

module.exports = { buildStickyPanel, handleStickyInteraction, hasManagementAccess, PANEL_FLAGS };
