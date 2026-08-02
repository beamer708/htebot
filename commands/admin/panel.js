const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Post or refresh a server panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o => o
      .setName('type')
      .setDescription('Which panel to post')
      .setRequired(true)
      .addChoices(
        { name: 'Dashboard',           value: 'dashboard' },
        { name: 'Server Rules',        value: 'server-rules' },
        { name: 'Marketing Campaigns', value: 'marketing-campaigns' },
        { name: 'Get Started',         value: 'get-started' },
        { name: 'Management Handbook', value: 'management-handbook' },
        { name: 'Staff Handbook',      value: 'staff-handbook' },
        { name: 'PR Handbook',         value: 'pr-handbook' },
        { name: 'PR Team Panel',       value: 'pr' },
      ))
    .addChannelOption(o => o
      .setName('channel')
      .setDescription('Channel to post in (defaults to this channel)')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(false)),

  async execute(interaction, client) {
    // Management role or Administrator only
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    const allowed = member && (
      member.roles.cache.has(config.managementRoleId) ||
      member.permissions.has(PermissionFlagsBits.Administrator)
    );
    if (!allowed) {
      return interaction.reply({
        content: 'Only management can post panels.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const type = interaction.options.getString('type');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const { postOrUpdatePanel } = require('../../panels/renderPanel');
      const result = await postOrUpdatePanel(channel, type);
      return interaction.editReply({
        content: result.updated
          ? `**${type}** panel refreshed in ${channel}.`
          : `**${type}** panel posted in ${channel}.`,
      });
    } catch (err) {
      console.error(`[Panel] ${type} error:`, err);
      return interaction.editReply({ content: `Failed to post the ${type} panel: \`${err.message}\`` });
    }
  },
};
