const {
  SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  MessageFlags, resolveColor,
} = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pr-panel')
    .setDescription('Open your personal PR Team panel — stats, outreach templates, and payout requests.'),

  async execute(interaction, client) {
    // ── Role gate ────────────────────────────────────────────────────
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    const hasPrRole = member && (
      member.roles.cache.has(config.roles.prTeam) ||
      member.roles.cache.has(config.roles.prManager) ||
      member.permissions.has('ManageGuild')
    );

    if (!hasPrRole) {
      return interaction.reply({
        content: '<:circlex:1507191508657508503> This command is restricted to PR Team members only.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── Build Components V2 ephemeral panel ──────────────────────────
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
          emoji: { name: 'Megaphone', id: '1507191527099596800' },
        },
        {
          label: 'Invitation Offer',
          description: 'Personal outreach message for inviting specific servers',
          value: 'invitation',
          emoji: { name: 'Select', id: '1507191532875153519' },
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
          emoji: { name: 'Target', id: '1507191539892224211' },
        },
        {
          label: 'Invite Link Setup',
          description: 'How to create and register your permanent invite link',
          value: 'invite_setup',
          emoji: { name: 'Link', id: '1507191523094167573' },
        },
        {
          label: 'Payout System',
          description: 'How the 50 Robux payout works and how to claim it',
          value: 'payouts',
          emoji: { name: 'Coin', id: '1507191513418039388' },
        },
        {
          label: 'Tracking and Stats',
          description: 'How invites are tracked and what the numbers mean',
          value: 'tracking',
          emoji: { name: 'chartbar', id: '1507191493603885256' },
        },
      ]);

    const statsBtn = new ButtonBuilder()
      .setCustomId('pr:mystats')
      .setLabel('My Stats')
      .setStyle(ButtonStyle.Primary)
      .setEmoji({ name: 'chartbar', id: '1507191493603885256' });

    const registerBtn = new ButtonBuilder()
      .setCustomId('pr:register')
      .setLabel('Register Invite')
      .setStyle(ButtonStyle.Success);

    const payoutBtn = new ButtonBuilder()
      .setCustomId('pr:payout')
      .setLabel('Request Payout')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji({ name: 'Coin', id: '1507191513418039388' });

    const container = new ContainerBuilder()
      .setAccentColor(resolveColor('#4ade80'))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '<:howtoglogo:1494830728113033327> **PR Team — Your Personal Panel**\n\n' +
          'Track your invites, grab outreach templates, browse the handbook, and manage your payouts. ' +
          'This panel is only visible to you.\n\n' +
          '<:squaredot:1507191535693860974> **My Stats** — View your invite count and payout eligibility\n' +
          '<:squaredot:1507191535693860974> **Register Invite** — Link your permanent invite code to your account\n' +
          '<:squaredot:1507191535693860974> **Request Payout** — Claim your 50 Robux once you reach 10 retained invites'
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(new ActionRowBuilder().addComponents(assetsMenu))
      .addActionRowComponents(new ActionRowBuilder().addComponents(handbookMenu))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(statsBtn, registerBtn, payoutBtn)
      );

    return interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  },
};
