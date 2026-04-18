const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    // Skip uncached partial messages where we can't check the author
    if (message.partial) return;
    if (message.author?.bot) return;
    if (message.channel.id === config.channels.logs) return;

    const logChannel = message.guild?.channels.cache.get(config.channels.logs);
    if (!logChannel) return;

    const deletedAt = Math.floor(Date.now() / 1000);
    const content = message.content
      ? `\`\`\`${message.content.slice(0, 1000)}\`\`\``
      : 'Message content unavailable — message was not cached.';

    const embed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle('🗑️ Message Deleted')
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Author', value: `${message.author.tag} (<@${message.author.id}>)`, inline: true },
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
        { name: 'Deleted At', value: `<t:${deletedAt}:R>`, inline: true },
        { name: 'Content', value: content, inline: false },
      )
      .setFooter({ text: 'HowToERLC Logs' })
      .setTimestamp();

    if (message.attachments.size > 0) {
      const urls = message.attachments.map(a => a.url).join('\n');
      embed.addFields({ name: 'Attachments', value: urls.slice(0, 1024), inline: false });
    }

    await logChannel.send({ embeds: [embed] });
  },
};
