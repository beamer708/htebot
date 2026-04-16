const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Post a server announcement.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o => o.setName('title').setDescription('Announcement title').setRequired(true))
    .addStringOption(o => o.setName('message').setDescription('Announcement body').setRequired(true))
    .addStringOption(o => o.setName('ping').setDescription('Role to ping (optional)').setRequired(false))
    .addChannelOption(o => o.setName('channel').setDescription('Channel to post in (defaults to updates channel)').setRequired(false)),

  async execute(interaction) {
    const title = interaction.options.getString('title');
    const message = interaction.options.getString('message');
    const pingRole = interaction.options.getString('ping');
    const targetChannel = interaction.options.getChannel('channel')
      || interaction.guild.channels.cache.get(config.channels.updates)
      || interaction.channel;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`📢 ${title}`)
      .setDescription(message)
      .setAuthor({ name: 'HowToERLC Announcement', iconURL: interaction.guild.iconURL() })
      .setFooter({ text: `Posted by ${interaction.user.tag} • HowToERLC` })
      .setTimestamp();

    const content = pingRole ? `<@&${pingRole}>` : '';
    await targetChannel.send({ content, embeds: [embed] });
    await interaction.reply({ content: `✅ Announcement posted in ${targetChannel}.`, ephemeral: true });
  },
};
