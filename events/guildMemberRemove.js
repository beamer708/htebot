const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    const logChannel = member.guild.channels.cache.get(config.channels.logs);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle('📤 Member Left')
      .addFields(
        { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
        { name: 'Joined', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
        { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true },
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  },
};
