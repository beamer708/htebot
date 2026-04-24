const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  MessageFlags, resolveColor,
} = require('discord.js');
const config = require('../../../config.json');

async function sendMainDashboard(interaction) {
  const infoMenu = new StringSelectMenuBuilder()
    .setCustomId('dashboard:info')
    .setPlaceholder('Server Information')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions([
      { label: 'About', description: 'Learn about HowToERLC', value: 'info_about' },
      { label: 'Server Guidelines', description: 'Rules and conduct expectations', value: 'info_guidelines' },
      { label: 'Advertising Guidelines', description: 'Rules for advertising here', value: 'info_advertising' },
    ]);

  const rolesMenu = new StringSelectMenuBuilder()
    .setCustomId('rolepanel:notifications')
    .setPlaceholder('Notification Roles')
    .setMinValues(0)
    .setMaxValues(3)
    .addOptions([
      { label: 'Server Updates', description: 'Get notified about announcements', value: config.roles.notifications.updates || 'updates' },
      { label: 'New Resources', description: 'Get notified when resources drop', value: config.roles.notifications.resources || 'resources' },
      { label: 'Partnerships', description: 'Get notified about new partners', value: config.roles.notifications.partnerships || 'partnerships' },
    ]);

  const websiteBtn = new ButtonBuilder()
    .setLabel('Website')
    .setStyle(ButtonStyle.Link)
    .setURL('https://howtoerlc.xyz');

  const assistBtn = new ButtonBuilder()
    .setCustomId('ticket:create')
    .setLabel('Get Assistance')
    .setStyle(ButtonStyle.Primary);

  const container = new ContainerBuilder()
    .setAccentColor(resolveColor(config.colors.primary))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '### Welcome to HowToERLC\n' +
        'You have just joined the **#1 resource hub** for ERLC community owners on Roblox. ' +
        'Browse our server information below, **grab your notification roles**, and visit **howtoerlc.xyz** for guides, templates, and tools built specifically for your community. ' +
        'Need help? Our staff team is always available. **Open a ticket** and we will get back to you.'
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(infoMenu)
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(rolesMenu)
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(websiteBtn, assistBtn)
    );

  await interaction.channel.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

module.exports = { sendMainDashboard };
