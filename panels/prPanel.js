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

async function sendPrPanel(interaction) {
  const assetsMenu = new StringSelectMenuBuilder()
    .setCustomId('pr:assets')
    .setPlaceholder('Outreach Assets')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions([
      {
        label: 'Server Advertisement',
        description: 'General server ad for posting in advertisement channels',
        value: 'advertisement',
        emoji: { name: 'RightArrow', id: '1498148469284667562' },
      },
      {
        label: 'Invitation Offer',
        description: 'Personal outreach message for inviting specific servers',
        value: 'invitation',
        emoji: { name: 'RightArrow', id: '1498148469284667562' },
      },
    ]);

  const handbookMenu = new StringSelectMenuBuilder()
    .setCustomId('pr:handbook')
    .setPlaceholder('PR Team Handbook')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions([
      {
        label: 'What is the PR Team?',
        description: 'Your role and responsibilities as a PR Team member',
        value: 'role',
        emoji: { name: 'Dot', id: '1496643767585865818' },
      },
      {
        label: 'Invite Link Setup',
        description: 'How to create and register your permanent invite link',
        value: 'invite_setup',
        emoji: { name: 'Dot', id: '1496643767585865818' },
      },
      {
        label: 'Payout System',
        description: 'How the 50 Robux payout works and how to claim it',
        value: 'payouts',
        emoji: { name: 'Dot', id: '1496643767585865818' },
      },
      {
        label: 'Tracking and Stats',
        description: 'How invites are tracked and what the numbers mean',
        value: 'tracking',
        emoji: { name: 'Dot', id: '1496643767585865818' },
      },
    ]);

  const statsBtn = new ButtonBuilder()
    .setCustomId('pr:mystats')
    .setLabel('My Stats')
    .setStyle(ButtonStyle.Primary)
    .setEmoji({ name: 'On', id: '1498148402180001942' });

  const registerBtn = new ButtonBuilder()
    .setCustomId('pr:register')
    .setLabel('Register Invite')
    .setStyle(ButtonStyle.Success)
    .setEmoji({ name: 'RightArrow', id: '1498148469284667562' });

  const payoutBtn = new ButtonBuilder()
    .setCustomId('pr:payout')
    .setLabel('Request Payout')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji({ name: 'Dot', id: '1496643767585865818' });

  const container = new ContainerBuilder()
    .setAccentColor(resolveColor('#4ade80'))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '<:howtoglogo:1494830728113033327> **HowToERLC PR Team — Invite Program**\n\n' +
        'Earn **50 Robux** for every **10 members** you successfully invite and retain for 30+ days. ' +
        'Use the menus below to access outreach templates, browse the handbook, and manage your invites.\n\n' +
        '<:Dot:1496643767585865818> Register a **permanent** (non-expiring) invite link using **Register Invite**\n' +
        '<:Dot:1496643767585865818> Share your link across ERLC communities and servers\n' +
        '<:Dot:1496643767585865818> When **10 of your invited members** stay for **30+ days**, click **Request Payout**\n' +
        '<:Dot:1496643767585865818> A PR Manager will review and process your **50 Robux** reward'
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(new ActionRowBuilder().addComponents(assetsMenu))
    .addActionRowComponents(new ActionRowBuilder().addComponents(handbookMenu))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(statsBtn, registerBtn, payoutBtn)
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

module.exports = { sendPrPanel };
