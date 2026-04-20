const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../../config.json');

async function sendMainDashboard(interaction) {
  const guild = interaction.guild;

  // ── Embed ──────────────────────────────────────────────────────────────────
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setAuthor({ name: 'HowToERLC', iconURL: guild.iconURL({ dynamic: true }) })
    .setDescription(
      'HowToERLC is the leading resource hub for ERLC community owners and builders on Roblox. ' +
      'Whether you\'re starting your first server or scaling an established community, you\'ll find guides, templates, department structures, livery resources, and direct community support here.\n\n' +
      'Our website at [howtoerlc.xyz](https://howtoerlc.xyz) extends everything in this server — submit staff applications, share suggestions, request partnerships, and access an AI assistant built specifically for ERLC. ' +
      'If you have a question that isn\'t answered here, open a support ticket below and a staff member will assist you.'
    )
    .setFooter({ text: 'giving insight to your needs.' });

  // ── Dropdown 1: Server Information ────────────────────────────────────────
  const infoMenu = new StringSelectMenuBuilder()
    .setCustomId('dashboard:info')
    .setPlaceholder('Server Information')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions([
      {
        label: 'Community Guidelines',
        description: 'Rules and conduct expectations',
        value: 'info_guidelines',
      },
      {
        label: 'Advertising Rules',
        description: 'How to advertise your server here',
        value: 'info_advertising',
      },
      {
        label: 'Partnership Guidelines',
        description: 'Requirements for partnering with us',
        value: 'info_partnerships',
      },
      {
        label: 'Terms of Service',
        description: 'Our terms and Discord\'s terms',
        value: 'info_tos',
      },
      {
        label: 'Mission Statement',
        description: 'What HowToERLC is about',
        value: 'info_mission',
      },
    ]);

  // ── Dropdown 2: Notification Roles ────────────────────────────────────────
  const rolesMenu = new StringSelectMenuBuilder()
    .setCustomId('rolepanel:notifications')
    .setPlaceholder('Notification Roles')
    .setMinValues(0)
    .setMaxValues(3)
    .addOptions([
      {
        label: 'Server Updates',
        description: 'Get notified about announcements',
        value: config.roles.notifications.updates || 'updates',
      },
      {
        label: 'New Resources',
        description: 'Get notified when resources drop',
        value: config.roles.notifications.resources || 'resources',
      },
      {
        label: 'Partnerships',
        description: 'Get notified about new partners',
        value: config.roles.notifications.partnerships || 'partnerships',
      },
    ]);

  // ── Buttons ────────────────────────────────────────────────────────────────
  const websiteBtn = new ButtonBuilder()
    .setLabel('Website')
    .setStyle(ButtonStyle.Link)
    .setURL('https://howtoerlc.xyz');

  const resourcesBtn = new ButtonBuilder()
    .setLabel('Resources')
    .setStyle(ButtonStyle.Link)
    .setURL('https://howtoerlc.xyz/resources');

  const supportBtn = new ButtonBuilder()
    .setCustomId('ticket:create')
    .setLabel('Contact Support')
    .setStyle(ButtonStyle.Primary);

  // ── Send ───────────────────────────────────────────────────────────────────
  await interaction.channel.send({
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(infoMenu),
      new ActionRowBuilder().addComponents(rolesMenu),
      new ActionRowBuilder().addComponents(websiteBtn, resourcesBtn, supportBtn),
    ],
  });
}

module.exports = { sendMainDashboard };
