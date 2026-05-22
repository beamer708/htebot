const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  MessageFlags, resolveColor,
} = require('discord.js');
const config = require('../config.json');

const FOOTER_IMAGE = 'https://cdn.discordapp.com/attachments/1461879573707882610/1499184076383588502/Embed_Footer_Banner.png';

// MediaGallery was added in discord.js 14.18 — guard for older installs
let MediaGalleryBuilder, MediaGalleryItemBuilder;
try {
  ({ MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js'));
} catch { /* not available */ }
const hasMediaGallery = typeof MediaGalleryBuilder === 'function';

async function sendMainDashboard(interaction) {
  const infoMenu = new StringSelectMenuBuilder()
    .setCustomId('dashboard:info')
    .setPlaceholder('Server Information')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions([
      {
        label: 'About',
        description: 'Learn about HowToERLC',
        value: 'info_about',
        emoji: { name: 'infocircle', id: '1507191522024755342' },
      },
      {
        label: 'Server Guidelines',
        description: 'Rules and conduct expectations',
        value: 'info_guidelines',
        emoji: { name: 'shieldcheck', id: '1507191534003552277' },
      },
      {
        label: 'Advertising Guidelines',
        description: 'Rules for advertising here',
        value: 'info_advertising',
        emoji: { name: 'Megaphone', id: '1507191527099596800' },
      },
    ]);

  const rolesMenu = new StringSelectMenuBuilder()
    .setCustomId('rolepanel:notifications')
    .setPlaceholder('Notification Roles')
    .setMinValues(0)
    .setMaxValues(3)
    .addOptions([
      {
        label: 'Change Log',
        description: 'Get notified about change logs',
        value: config.roles.notifications.updates || 'updates',
        emoji: { name: 'Bell', id: '1507191488667320390' },
      },
      {
        label: 'New Resources',
        description: 'Get notified when resources drop',
        value: config.roles.notifications.resources || 'resources',
        emoji: { name: 'Book', id: '1507191489174700203' },
      },
      {
        label: 'Announcements',
        description: 'Get notified about announcements',
        value: config.roles.notifications.announcements || 'announcements',
        emoji: { name: 'Megaphone', id: '1507191527099596800' },
      },
    ]);

  const websiteBtn = new ButtonBuilder()
    .setLabel('Website')
    .setStyle(ButtonStyle.Link)
    .setURL('https://howtoerlc.xyz');

  const assistBtn = new ButtonBuilder()
    .setCustomId('ticket:create')
    .setLabel('Get Assistance')
    .setStyle(ButtonStyle.Success);

  const applyBtn = new ButtonBuilder()
    .setCustomId('staff_apply')
    .setLabel('Apply')
    .setStyle(ButtonStyle.Success);

  const container = new ContainerBuilder()
    .setAccentColor(resolveColor('#4ade80'))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        'Welcome to **HowToERLC**, the #1 resource hub for ERLC community owners on Roblox. ' +
        'Browse our server information below, grab your notification roles, and visit **howtoerlc.xyz** for guides, templates, and tools built for your community. ' +
        'Need help? Our staff team is always here. Open a ticket and we will get back to you.'
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(new ActionRowBuilder().addComponents(infoMenu))
    .addActionRowComponents(new ActionRowBuilder().addComponents(rolesMenu))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(websiteBtn, assistBtn, applyBtn)
    );

  if (hasMediaGallery) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(FOOTER_IMAGE)
      )
    );
  }

  await interaction.channel.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

module.exports = { sendMainDashboard };
