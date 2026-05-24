const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../../config.json');
const { getOpenTicketByChannel } = require('../../utils/ticketUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a member to the current ticket so they can view and participate.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member to add to this ticket')
        .setRequired(true)
    ),

  async execute(interaction) {
    // ── Must be inside a ticket channel ──────────────────────────────────
    const ticket = getOpenTicketByChannel(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({
        content: '<:circlex:1507191508657508503> This command can only be used inside an open ticket channel.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── Staff or ticket creator only ──────────────────────────────────────
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    const isStaff = member && (
      member.roles.cache.has(config.roles.staff) ||
      member.roles.cache.has(config.roles.admin) ||
      member.permissions.has('ManageChannels')
    );
    if (!isStaff && ticket.userId !== interaction.user.id) {
      return interaction.reply({
        content: '<:circlex:1507191508657508503> Only the ticket creator or staff can add members to this ticket.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── Resolve the target member ─────────────────────────────────────────
    const targetUser = interaction.options.getUser('user');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return interaction.reply({
        content: '<:circlex:1507191508657508503> That user could not be found in this server.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── Don't add the bot itself or the ticket creator again ──────────────
    if (targetUser.id === interaction.client.user.id) {
      return interaction.reply({
        content: '<:circlex:1507191508657508503> You cannot add the bot to a ticket.',
        flags: MessageFlags.Ephemeral,
      });
    }
    if (targetUser.id === ticket.userId) {
      return interaction.reply({
        content: '<:circlex:1507191508657508503> That member already has access — they opened this ticket.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── Check if they already have an explicit overwrite ─────────────────
    const existing = interaction.channel.permissionOverwrites.cache.get(targetUser.id);
    if (existing?.allow.has(PermissionFlagsBits.ViewChannel)) {
      return interaction.reply({
        content: `<:circlex:1507191508657508503> ${targetMember} already has access to this ticket.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── Grant same permissions as the original ticket opener ─────────────
    await interaction.channel.permissionOverwrites.edit(targetUser.id, {
      ViewChannel:        true,
      SendMessages:       true,
      AttachFiles:        true,
      ReadMessageHistory: true,
    });

    return interaction.reply({
      content: `<:circlecheck:1507191508066107532> **${targetMember.displayName}** has been added to this ticket.`,
    });
  },
};
