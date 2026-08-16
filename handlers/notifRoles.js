// handlers/notifRoles.js — the "Notification Roles" panel: an ephemeral
// Components V2 message with one titled/described Section per role and an
// inline toggle button. customIds are stable (notifrole_toggle_<roleId>) so
// the toggles keep working across restarts with no per-message state.
//
// Only these five role IDs are ever added or removed. A role that no longer
// exists in the guild is skipped gracefully.
const {
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder,
  ButtonBuilder, ButtonStyle, MessageFlags, resolveColor,
} = require('discord.js');
const config = require('../config.json');
const { e } = require('../utils/appEmojis');

const ACCENT = resolveColor(config.colors.primary || '#4ade80');
const EPHEMERAL_V2 = MessageFlags.Ephemeral | MessageFlags.IsComponentsV2;
const TOGGLE_PREFIX = 'notifrole_toggle_';

// Single source of truth for the panel. Edit copy here.
const NOTIF_ROLES = [
  { id: '1485746083635400954', title: 'Announcements', emojiName: 'Megaphone', emojiFallback: '📣',
    description: 'Major server and website news, big launches and important updates.' },
  { id: '1485745951451775211', title: 'Updates', emojiName: 'Bell', emojiFallback: '🔔',
    description: 'Smaller website and bot changes, new features and changelog highlights.' },
  { id: '1485745906539302972', title: 'Giveaways', emojiName: 'Confetti', emojiFallback: '🎉',
    description: 'Get pinged when we drop a giveaway. Free to enter.' },
  { id: '1508519549832527902', title: 'Events', emojiName: 'events', emojiFallback: '📅',
    description: 'Community nights, launch events, and partnered events.' },
  { id: '1508519550264672428', title: 'New Listings', emojiName: 'newlistings', emojiFallback: '🆕',
    description: 'Notified when notable new servers and assets go live on the site.' },
];

const VALID_IDS = new Set(NOTIF_ROLES.map(r => r.id));

/**
 * Build the ephemeral V2 panel for `member`. Roles missing from the guild are
 * skipped. Returns a full reply/update payload.
 */
function buildNotifRolesPanel(guild, member) {
  const container = new ContainerBuilder()
    .setAccentColor(ACCENT)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        // Heading directly above its description, no blank line
        `## Notification Roles\n` +
        `-# Pick the pings you want. Toggle any role on or off, only get notified about what you care about.`
      )
    );

  for (const role of NOTIF_ROLES) {
    // Skip any role that no longer exists in the guild
    if (!guild.roles.cache.has(role.id)) continue;

    const has = member.roles.cache.has(role.id);
    const icon = e(role.emojiName, role.emojiFallback);

    const button = new ButtonBuilder()
      .setCustomId(`${TOGGLE_PREFIX}${role.id}`)
      .setLabel(has ? 'Enabled' : 'Enable')
      .setStyle(has ? ButtonStyle.Success : ButtonStyle.Secondary);

    container
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `${icon ? `${icon} ` : ''}**${role.title}**\n-# ${role.description}`
            )
          )
          .setButtonAccessory(button)
      );
  }

  return { components: [container], flags: EPHEMERAL_V2 };
}

/** Entry point for the "Notification Roles" button. */
async function handleNotifRolesButton(interaction) {
  const member = interaction.member
    ?? await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member) {
    return interaction.reply({ content: 'Could not load your member data. Try again in a moment.', flags: MessageFlags.Ephemeral });
  }
  return interaction.reply(buildNotifRolesPanel(interaction.guild, member));
}

/** Toggle handler for notifrole_toggle_<roleId>. */
async function handleNotifRoleToggle(interaction) {
  try {
    const roleId = interaction.customId.slice(TOGGLE_PREFIX.length);

    // Safety: never touch anything outside the five configured roles
    if (!VALID_IDS.has(roleId)) {
      return interaction.reply({ content: 'That is not a valid notification role.', flags: MessageFlags.Ephemeral });
    }

    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
      return interaction.reply({ content: 'That notification role no longer exists. Let staff know.', flags: MessageFlags.Ephemeral });
    }

    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: 'Could not load your member data. Try again in a moment.', flags: MessageFlags.Ephemeral });
    }

    const has = member.roles.cache.has(roleId);
    try {
      if (has) await member.roles.remove(roleId, 'Notification role toggled off');
      else await member.roles.add(roleId, 'Notification role toggled on');
    } catch (err) {
      console.warn(`[NotifRoles] Could not ${has ? 'remove' : 'add'} role ${roleId} for ${member.user?.tag}: ${err.message}`);
      return interaction.reply({
        content: `I could not ${has ? 'remove' : 'add'} that role. My role may sit below it, or I am missing permissions. Let staff know.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Reflect the new state in place (the visual flip is the confirmation)
    return interaction.update(buildNotifRolesPanel(interaction.guild, member));
  } catch (err) {
    console.error('[NotifRoles] Toggle error:', err);
    const msg = { content: 'Something went wrong toggling that role. Try again.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
    else await interaction.reply(msg).catch(() => {});
  }
}

module.exports = { buildNotifRolesPanel, handleNotifRolesButton, handleNotifRoleToggle, NOTIF_ROLES, TOGGLE_PREFIX };
