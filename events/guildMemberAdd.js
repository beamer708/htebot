const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const welcomeChannel = member.guild.channels.cache.get(config.channels.welcome);
    if (!welcomeChannel) return;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('👋 Welcome to HowToERLC!')
      .setDescription(`Hey <@${member.id}>, welcome to the **HowToERLC** Discord server!\n\nWe're the #1 resource hub for building and running ERLC communities.\n\nCheck out our website at **[howtoerlc.xyz](https://howtoerlc.xyz)** for guides, resources, and more.`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '📋 Get Started', value: 'Read the rules and grab your roles from the role panel.', inline: false },
        { name: '🎫 Need Help?', value: 'Open a support ticket and our staff will assist you.', inline: false },
      )
      .setFooter({ text: `HowToERLC • Member #${member.guild.memberCount}` })
      .setTimestamp();

    await welcomeChannel.send({ content: `<@${member.id}>`, embeds: [embed] });

    const logChannel = member.guild.channels.cache.get(config.channels.logs);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('📥 Member Joined')
        .addFields(
          { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true },
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] });
    }
  },
};
