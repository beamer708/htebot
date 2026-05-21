const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags,
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
        content: '<:Cancel:1494830662581092482> This command is restricted to PR Team members only.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── Build ephemeral panel ────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: 'HowToERLC PR Team', iconURL: interaction.guild.iconURL() })
      .setTitle('📣 PR Team Panel')
      .setDescription(
        'Your personal PR Team control panel. Use the buttons and menus below to manage your invite, check stats, and claim your payout.'
      )
      .addFields(
        {
          name: '📊 My Stats',
          value: 'See your total invites, retained count, and whether you\'re eligible for a payout.',
          inline: false,
        },
        {
          name: '🔗 Register Invite',
          value: 'Link your permanent invite code to your account so the bot can track your invites.',
          inline: false,
        },
        {
          name: '💰 Request Payout',
          value: 'Once you have 10 retained invites (30+ days), submit a payout request for your 50 Robux.',
          inline: false,
        },
      )
      .setFooter({ text: 'HowToERLC PR Team • Only visible to you' })
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

    const assetsRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('pr:assets')
        .setPlaceholder('📋 Assets — Select an outreach template...')
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
        ),
    );

    const handbookRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('pr:handbook')
        .setPlaceholder('📖 Handbook — Browse a section...')
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
            .setDescription('How the 50 Robux payout works')
            .setValue('payouts')
            .setEmoji('💰'),
          new StringSelectMenuOptionBuilder()
            .setLabel('📊 Tracking & Stats')
            .setDescription('How invites are tracked and what the numbers mean')
            .setValue('tracking')
            .setEmoji('📊'),
        ),
    );

    return interaction.reply({
      embeds: [embed],
      components: [buttonRow, assetsRow, handbookRow],
      flags: MessageFlags.Ephemeral,
    });
  },
};
