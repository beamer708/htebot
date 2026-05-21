const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
} = require('discord.js');
const config = require('../config.json');

async function sendPrPanel(interaction) {
  const guild = interaction.guild;

  // ── Message 1: Hero Embed + Action Buttons ───────────────────────
  const heroEmbed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setAuthor({ name: 'HowToERLC PR Team', iconURL: guild.iconURL() })
    .setTitle('📣 PR Team — Invite Program')
    .setDescription(
      'Earn **50 Robux** for every **10 members** you successfully invite and retain!\n\n' +
      'Use this panel to manage your invite link, check your progress, and claim your reward.'
    )
    .addFields(
      {
        name: '🎯 How It Works',
        value:
          '• Create a **permanent** (non-expiring) Discord invite link\n' +
          '• Register it using the **Register Invite** button below\n' +
          '• Share your link across ERLC communities\n' +
          '• When **10 of your invited members** stay for **30+ days**, you qualify for a **50 Robux** payout',
        inline: false,
      },
      {
        name: '💰 Payout Rules',
        value:
          '• 10 retained invites (30+ days each) required per payout\n' +
          '• Click **Request Payout** once you hit 10 retained invites\n' +
          '• A **PR Manager** will review and process your payout\n' +
          '• One payout per 10 retained invites — the counter resets after each claim',
        inline: false,
      },
      {
        name: '📊 Track Your Progress',
        value: 'Click **My Stats** at any time to see your invite count, retention rate, and payout eligibility.',
        inline: false,
      },
    )
    .setFooter({ text: 'HowToERLC PR Team • howtoerlc.xyz' })
    .setTimestamp();

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('pr:mystats')
      .setLabel('📊 My Stats')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('pr:register')
      .setLabel('🔗 Register Invite')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('pr:payout')
      .setLabel('💰 Request Payout')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.channel.send({ embeds: [heroEmbed], components: [buttonRow] });

  // ── Message 2: Assets Select Menu ───────────────────────────────
  const assetsEmbed = new EmbedBuilder()
    .setColor(config.colors.info)
    .setTitle('📋 Outreach Assets')
    .setDescription(
      'Select a template below to receive a ready-to-use outreach message.\n' +
      'The template will be sent only to you so you can copy and paste it.'
    )
    .setFooter({ text: 'HowToERLC PR Team • Templates are sent privately' });

  const assetsMenu = new StringSelectMenuBuilder()
    .setCustomId('pr:assets')
    .setPlaceholder('📋 Select an outreach template...')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('📢 Server Advertisement')
        .setDescription('General server ad for posting in advertisement channels')
        .setValue('advertisement')
        .setEmoji('📢'),
      new StringSelectMenuOptionBuilder()
        .setLabel('📨 Invitation Offer')
        .setDescription('Personal outreach message for inviting specific servers')
        .setValue('invitation')
        .setEmoji('📨'),
    );

  const assetsRow = new ActionRowBuilder().addComponents(assetsMenu);
  await interaction.channel.send({ embeds: [assetsEmbed], components: [assetsRow] });

  // ── Message 3: Handbook Select Menu ─────────────────────────────
  const handbookEmbed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('📖 PR Team Handbook')
    .setDescription(
      'Select a section below to learn about your role, the invite system, and how payouts work.'
    )
    .setFooter({ text: 'HowToERLC PR Team • Represent us professionally' });

  const handbookMenu = new StringSelectMenuBuilder()
    .setCustomId('pr:handbook')
    .setPlaceholder('📖 Browse the handbook...')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('🎯 What is the PR Team?')
        .setDescription('Your role and responsibilities')
        .setValue('role')
        .setEmoji('🎯'),
      new StringSelectMenuOptionBuilder()
        .setLabel('🔗 Invite Link Setup')
        .setDescription('How to create and register your permanent invite link')
        .setValue('invite_setup')
        .setEmoji('🔗'),
      new StringSelectMenuOptionBuilder()
        .setLabel('💰 Payout System')
        .setDescription('How the 50 Robux payout works and how to claim it')
        .setValue('payouts')
        .setEmoji('💰'),
      new StringSelectMenuOptionBuilder()
        .setLabel('📊 Tracking & Stats')
        .setDescription('How invites are tracked and what the numbers mean')
        .setValue('tracking')
        .setEmoji('📊'),
    );

  const handbookRow = new ActionRowBuilder().addComponents(handbookMenu);
  await interaction.channel.send({ embeds: [handbookEmbed], components: [handbookRow] });

  // ── Message 4: Footer Strip ──────────────────────────────────────
  const footerEmbed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setDescription(
      'By being part of the PR team you agree to represent **HowToERLC** professionally in all outreach.\n' +
      'Misuse of outreach assets or the invite system may result in removal. • Est. 2024'
    );

  await interaction.channel.send({ embeds: [footerEmbed] });
}

module.exports = { sendPrPanel };
