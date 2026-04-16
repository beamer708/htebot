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
      .setTitle('🎫 HowToERLC Support')
      .setDescription('Need help? Our staff team is here for you!\n\nClick the button below to open a private support ticket. Please include as much detail as possible so we can assist you quickly.\n\n**Response times may vary. Please be patient.**')
      .addFields(
        { name: '📌 Before You Open a Ticket', value: '• Check the FAQ and help channels first\n• One ticket per issue\n• Be respectful to staff', inline: false },
      )
      .setFooter({ text: 'HowToERLC Support • howtoerlc.xyz' })
      .setTimestamp();

    const btn = new ButtonBuilder()
      .setCustomId('ticket:create')
      .setLabel('🎫 Open a Ticket')
      .setStyle(ButtonStyle.Primary);

    await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
    await interaction.reply({ content: '✅ Ticket panel posted.', ephemeral: true });
  },
};
