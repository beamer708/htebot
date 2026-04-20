const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-panel')
    .setDescription('Create a self-assign role panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o => o.setName('title').setDescription('Panel title').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Panel description').setRequired(true))
    .addStringOption(o => o.setName('roles').setDescription('Role IDs, comma-separated (e.g. 123,456,789)').setRequired(true)),

  async execute(interaction) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const roleIds = interaction.options.getString('roles').split(',').map(r => r.trim()).filter(Boolean);

    if (roleIds.length > 5) {
      return interaction.reply({ content: 'Maximum 5 roles per panel.', ephemeral: true });
    }

    const buttons = [];
    for (const roleId of roleIds) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) {
        return interaction.reply({ content: `Role ID \`${roleId}\` not found.`, ephemeral: true });
      }
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`role:${roleId}`)
          .setLabel(role.name)
          .setStyle(ButtonStyle.Secondary),
      );
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(title)
      .setDescription(`${description}\n\nClick a button below to add or remove a role.`)
      .setFooter({ text: 'HowToERLC' });

    const row = new ActionRowBuilder().addComponents(buttons);
    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: 'Role panel created.', ephemeral: true });
  },
};
