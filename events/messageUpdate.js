const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    if (newMessage.partial) {
      try { await newMessage.fetch(); } catch { return; }
    }

    if (newMessage.author?.bot) return;
    if (newMessage.channel.id === config.channels.logs) return;

    const oldContent = oldMessage.partial ? null : oldMessage.content;
    const newContent = newMessage.content;

    // Skip embed-only edits where text content didn't change
    if (oldContent !== null && oldContent === newContent) return;

    const logChannel = newMessage.guild?.channels.cache.get(config.channels.logs);
    if (!logChannel) return;

    const editedAt = Math.floor(Date.now() / 1000);

    const beforeText = oldContent !== null
      ? `\`\`\`${oldContent.slice(0, 1000)}\`\`\``
      : 'Not cached';

    const afterText = newContent
      ? `\`\`\`${newContent.slice(0, 1000)}\`\`\``
      : '*(empty)*';

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('✏️ Message Edited')
      .setThumbnail(newMessage.author.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Author', value: `${newMessage.author.tag} (<@${newMessage.author.id}>)`, inline: true },
        { name: 'Channel', value: `<#${newMessage.channel.id}>`, inline: true },
        { name: 'Edited At', value: `<t:${editedAt}:R>`, inline: true },
        { name: 'Before', value: beforeText, inline: false },
        { name: 'After', value: afterText, inline: false },
      )
      .setFooter({ text: 'HowToERLC Logs' })
      .setTimestamp();

    const jumpButton = new ButtonBuilder()
      .setLabel('Jump to Message')
      .setStyle(ButtonStyle.Link)
      .setURL(newMessage.url);

    const row = new ActionRowBuilder().addComponents(jumpButton);

    await logChannel.send({ embeds: [embed], components: [row] });
  },
};
