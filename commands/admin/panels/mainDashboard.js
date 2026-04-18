const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
} = require('discord.js');
const config = require('../../../config.json');

async function sendMainDashboard(interaction) {
  const guild = interaction.guild;

  // ── Message 1: Hero Information Embed ───────────────────────────
  const heroEmbed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setAuthor({ name: 'HowToERLC', iconURL: guild.iconURL() })
    .setTitle('📋 Welcome to HowToERLC')
    .setDescription(
      'The **#1 resource hub** for building and running ERLC communities on Roblox.\n' +
      'Everything a community owner needs — all in one place.'
    )
    .addFields(
      {
        name: '🌐 Our Website',
        value: '[howtoerlc.xyz](https://howtoerlc.xyz) — guides, templates, tools, and resources built specifically for ERLC communities.',
        inline: false,
      },
      {
        name: '🗂️ What You\'ll Find Here',
        value: '• Staff application forms\n• Suggestion submissions\n• Partnership requests\n• AI assistant for ERLC questions\n• Free community resources & downloads',
        inline: false,
      },
      {
        name: '🧭 How to Use This Server',
        value: '• Browse resource channels for templates and guides\n• Select notification roles below to stay updated\n• Open a support ticket if you need help\n• Submit forms and suggestions via the website',
        inline: false,
      },
    )
    .setFooter({ text: 'HowToERLC • howtoerlc.xyz' })
    .setTimestamp();

  const heroRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('🌐 Visit Website')
      .setStyle(ButtonStyle.Link)
      .setURL(config.website),
    new ButtonBuilder()
      .setCustomId('ticket:create')
      .setLabel('🎫 Get Assistance')
      .setStyle(ButtonStyle.Primary),
  );

  await interaction.channel.send({ embeds: [heroEmbed], components: [heroRow] });

  // ── Message 2: Notification Role Selector ────────────────────────
  const notifEmbed = new EmbedBuilder()
    .setColor(config.colors.info)
    .setTitle('🔔 Notification Roles')
    .setDescription(
      'Select the updates you want to be notified about.\n' +
      'You can pick multiple. Select the same option again to remove it.'
    )
    .setFooter({ text: 'HowToERLC • Roles update instantly' });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('rolepanel:notifications')
    .setPlaceholder('📬 Choose your notification preferences...')
    .setMinValues(0)
    .setMaxValues(3)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('📢 Server Updates')
        .setDescription('Server announcements')
        .setValue(config.roles.notifications.updates)
        .setEmoji('📢'),
      new StringSelectMenuOptionBuilder()
        .setLabel('📦 New Resources')
        .setDescription('New guides and templates')
        .setValue(config.roles.notifications.resources)
        .setEmoji('📦'),
      new StringSelectMenuOptionBuilder()
        .setLabel('🤝 Partnerships')
        .setDescription('Partnership announcements')
        .setValue(config.roles.notifications.partnerships)
        .setEmoji('🤝'),
    );

  const selectRow = new ActionRowBuilder().addComponents(selectMenu);
  await interaction.channel.send({ embeds: [notifEmbed], components: [selectRow] });

  // ── Message 3: Footer Rule Strip ─────────────────────────────────
  const footerEmbed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setDescription(
      'By being in this server you agree to follow our rules and Discord\'s ' +
      '[Terms of Service](https://discord.com/terms).\n' +
      'Staff decisions are final. • Est. 2024'
    );

  await interaction.channel.send({ embeds: [footerEmbed] });
}

module.exports = { sendMainDashboard };
