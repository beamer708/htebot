// handlers/panelDashboard.js — the /panel configuration dashboard (ephemeral,
// management only, Components V2). Maps every panel type to a target channel
// (persisted in sqlite via panels/panelManager), and deploys/updates panels
// from one place. customId prefix "cfgpanel"; all ids are stable so the
// dashboard works across restarts.
const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType,
  MessageFlags, PermissionFlagsBits, resolveColor,
} = require('discord.js');
const config = require('../config.json');
const {
  PANEL_TYPES, getPanelState, getAllPanelStates, setPanelChannel,
  deployPanel, deployAll,
} = require('../panels/panelManager');

const ACCENT = resolveColor(config.colors.primary || '#4ade80');
const PANEL_FLAGS = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;

async function hasManagementAccess(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  return !!member && (
    member.roles.cache.has(config.managementRoleId) ||
    member.permissions.has(PermissionFlagsBits.Administrator)
  );
}

/**
 * Build the dashboard container. When `selectedType` is set, the view shows
 * that panel's channel select and per-panel deploy button; otherwise the
 * Deploy All / Update All row.
 */
function buildDashboard(selectedType = null, notice = null) {
  const states = getAllPanelStates();

  const lines = PANEL_TYPES.map(meta => {
    const state = states.get(meta.type);
    const target = state?.channel_id ? `<#${state.channel_id}>` : '`not set`';
    const live = state?.message_id ? ' `live`' : '';
    return `- **${meta.label}**  ${target}${live}`;
  });

  const container = new ContainerBuilder()
    .setAccentColor(ACCENT)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 🛠️ Panel Configuration\n` +
        `-# Map each panel to its channel, then deploy. Updating deletes the old panel message and posts the newest version.\n\n` +
        lines.join('\n') +
        (notice ? `\n\n${notice}` : '')
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  const picker = new StringSelectMenuBuilder()
    .setCustomId('cfgpanel:pick')
    .setPlaceholder('Configure a panel...')
    .setMinValues(1).setMaxValues(1)
    .addOptions(PANEL_TYPES.map(meta => ({
      label: meta.label,
      value: meta.type,
      description: getPanelState(meta.type)?.channel_id ? 'Channel set' : 'No channel set yet',
      default: meta.type === selectedType,
    })));
  container.addActionRowComponents(new ActionRowBuilder().addComponents(picker));

  if (selectedType) {
    const meta = PANEL_TYPES.find(m => m.type === selectedType);
    const state = getPanelState(selectedType);

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Configuring: ${meta?.label ?? selectedType}**\n` +
        `-# Current channel: ${state?.channel_id ? `<#${state.channel_id}>` : 'not set'}. Pick a channel below, then deploy.`
      )
    );

    const channelPicker = new ChannelSelectMenuBuilder()
      .setCustomId(`cfgpanel:setch:${selectedType}`)
      .setPlaceholder('Pick the target channel')
      .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setMinValues(1).setMaxValues(1);
    container.addActionRowComponents(new ActionRowBuilder().addComponents(channelPicker));

    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`cfgpanel:one:${selectedType}`)
          .setLabel(state?.message_id ? 'Update This Panel' : 'Deploy This Panel')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!state?.channel_id),
        new ButtonBuilder().setCustomId('cfgpanel:back').setLabel('Back').setStyle(ButtonStyle.Secondary),
      )
    );
  } else {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfgpanel:deployall').setLabel('Deploy All').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cfgpanel:updateall').setLabel('Update All').setStyle(ButtonStyle.Primary),
      )
    );
  }

  return container;
}

function dashboardPayload(selectedType = null, notice = null) {
  return { components: [buildDashboard(selectedType, notice)], flags: PANEL_FLAGS };
}

function summarize(results) {
  const posted   = results.filter(r => r.ok && r.action === 'posted').map(r => r.label);
  const replaced = results.filter(r => r.ok && r.action === 'replaced').map(r => r.label);
  const skipped  = results.filter(r => r.ok && r.skipped).map(r => r.label);
  const failed   = results.filter(r => !r.ok && r.error !== 'no channel set').map(r => `${r.label} (${r.error})`);
  const unset    = results.filter(r => !r.ok && r.error === 'no channel set').map(r => r.label);

  const lines = [];
  if (posted.length)   lines.push(`**Posted:** ${posted.join(', ')}`);
  if (replaced.length) lines.push(`**Updated:** ${replaced.join(', ')}`);
  if (skipped.length)  lines.push(`**Skipped (already live, use Update All):** ${skipped.join(', ')}`);
  if (unset.length)    lines.push(`**No channel set:** ${unset.join(', ')}`);
  if (failed.length)   lines.push(`**Failed:** ${failed.join(', ')}`);
  return lines.join('\n') || 'Nothing to do.';
}

// ── Interaction router (customId prefix "cfgpanel") ──────────────────────────
async function handleDashboardInteraction(interaction, client) {
  try {
    if (!await hasManagementAccess(interaction)) {
      return interaction.reply({ content: 'Only management can configure panels.', flags: MessageFlags.Ephemeral });
    }

    const [, action, arg] = interaction.customId.split(':');

    if (interaction.isStringSelectMenu() && action === 'pick') {
      return interaction.update(dashboardPayload(interaction.values[0]));
    }

    if (interaction.isChannelSelectMenu() && action === 'setch') {
      const channelId = interaction.values[0];
      setPanelChannel(arg, channelId);
      return interaction.update(dashboardPayload(arg, `-# Saved: this panel now targets <#${channelId}>.`));
    }

    if (interaction.isButton()) {
      if (action === 'back') {
        return interaction.update(dashboardPayload());
      }

      if (action === 'one') {
        await interaction.deferUpdate();
        const result = await deployPanel(client, arg);
        const meta = PANEL_TYPES.find(m => m.type === arg);
        const notice = result.ok
          ? `-# ${meta?.label ?? arg} ${result.action === 'replaced' ? 'updated' : 'posted'}.`
          : `-# ${meta?.label ?? arg} failed: ${result.error}`;
        return interaction.editReply(dashboardPayload(arg, notice));
      }

      if (action === 'deployall' || action === 'updateall') {
        await interaction.deferUpdate();
        const results = await deployAll(client, action === 'deployall' ? 'deploy' : 'update');
        await interaction.editReply(dashboardPayload());
        return interaction.followUp({ content: summarize(results), flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[PanelDashboard] Error:', err);
    const msg = { content: 'Something went wrong with the panel dashboard. Check the logs.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
    else await interaction.reply(msg).catch(() => {});
  }
}

module.exports = { buildDashboard, dashboardPayload, handleDashboardInteraction, hasManagementAccess, PANEL_FLAGS };
