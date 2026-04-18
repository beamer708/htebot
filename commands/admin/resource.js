const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resource')
    .setDescription('Post a new resource release announcement.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o => o.setName('title').setDescription('Resource title').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('What is this resource?').setRequired(true))
    .addStringOption(o => o.setName('link').setDescription('Download/access link').setRequired(true))
    .addStringOption(o => o.setName('type').setDescription('Resource type').setRequired(false)
      .addChoices(
        { name: 'Guide', value: 'Guide' },
        { name: 'Template', value: 'Template' },
        { name: 'Livery', value: 'Livery' },
        { name: 'Department Structure', value: 'Department Structure' },
        { name: 'CAD System', value: 'CAD System' },
        { name: 'Graphic Design', value: 'Graphic Design' },
        { name: 'Other', value: 'Other' },
      )),

  async execute(interaction) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const link = interaction.options.getString('link');
    const type = interaction.options.getString('type') || 'Resource';

    const resourceChannel = interaction.guild.channels.cache.get(config.channels.resources)
      || interaction.channel;
    const pingRole = config.roles.notifications?.resources;

    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle(`📦 New ${type} Released!`)
      .setDescription(description)
      .addFields(
        { name: '🔗 Access Link', value: link, inline: false },
        { name: '🏷️ Type', value: type, inline: true },
        { name: '👤 Posted By', value: interaction.user.tag, inline: true },
      )
      .setAuthor({ name: 'HowToERLC Resources', iconURL: interaction.guild.iconURL() })
      .setFooter({ text: 'HowToERLC • howtoerlc.xyz' })
      .setTimestamp();

    const content = pingRole ? `<@&${pingRole}>` : '';
    await resourceChannel.send({ content, embeds: [embed] });
    await interaction.reply({ content: `✅ Resource posted in ${resourceChannel}.`, ephemeral: true });
  },
};
