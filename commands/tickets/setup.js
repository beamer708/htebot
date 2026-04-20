const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('Post the support ticket creation panel in this channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('HowToERLC Support')
      .setDescription('Our staff team is here to help. Click the button below to open a private support ticket and describe your issue. Please be as detailed as possible — it helps us assist you faster.\n\nResponse times may vary. We appreciate your patience.')
      .addFields(
        { name: 'Before You Open a Ticket', value: 'Check existing help channels first. One ticket per issue. Be respectful to staff.', inline: false },
      )
      .setFooter({ text: 'HowToERLC Support — howtoerlc.xyz' });

    const btn = new ButtonBuilder()
      .setCustomId('ticket:create')
      .setLabel('Open a Ticket')
      .setStyle(ButtonStyle.Primary);

    await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
    await interaction.reply({ content: 'Ticket panel posted.', ephemeral: true });
  },
};
