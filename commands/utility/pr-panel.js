const {
  SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  MessageFlags, resolveColor,
} = require('discord.js');
const config = require('../../config.json');
const content = require('../../panels/panelContent');
const { e } = require('../../utils/appEmojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pr-panel')
    .setDescription('Open your personal PR Team panel with stats, outreach templates, and payout requests.'),

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
        content: `${e('circlex', '❌')} This command is restricted to PR Team members only.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── Personal V2 panel: one merged select + one button row ────────
    const c = content.prPanel();
    const { selectOption } = require('../../panels/renderPanel');

    const menu = new StringSelectMenuBuilder()
      .setCustomId('pr:menu')
      .setPlaceholder(c.selectPlaceholder)
      .setMinValues(1).setMaxValues(1)
      .addOptions(c.selectOptions.map(selectOption));

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('pr:mystats').setLabel('My Stats').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('pr:register').setLabel('Register Invite').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('pr:payout').setLabel('Request Payout').setStyle(ButtonStyle.Secondary),
    );

    const container = new ContainerBuilder()
      .setAccentColor(resolveColor(config.colors.primary || '#4ade80'))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ${e('HTELogo', '🤝')} PR Team, Your Personal Panel\n` +
          '-# Track your invites, grab outreach templates, browse the handbook, and manage your payouts. ' +
          'This panel is **only visible to you**.\n\n' +
          `- **My Stats** shows your invite count and payout eligibility\n` +
          `- **Register Invite** links your permanent invite code to your account\n` +
          `- **Request Payout** claims your **${config.prPayout?.rewardRobux ?? 50} Robux** at ${config.prPayout?.requiredRetained ?? 5} retained invites`
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(new ActionRowBuilder().addComponents(menu))
      .addActionRowComponents(buttons);

    return interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  },
};
