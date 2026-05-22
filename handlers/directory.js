// handlers/directory.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');
const { log } = require('./logger');

async function handleDirectory(client, req, res) {
  const { title, description, inviteUrl, logoUrl, category, submitterUsername } = req.body;

  if (!title || !description || !inviteUrl || !category || !submitterUsername) {
    return res.status(400).json({ success: false, error: 'Missing required fields: title, description, inviteUrl, category, submitterUsername.' });
  }

  try {
    const channel = await client.channels.fetch(config.channels.directory).catch(() => null);
    if (!channel) return res.status(500).json({ success: false, error: 'Directory channel not found.' });

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0x52D973)
      .addFields(
        { name: 'Category',     value: category,          inline: true },
        { name: 'Submitted By', value: submitterUsername, inline: true },
      )
      .setTimestamp();

    if (logoUrl) embed.setThumbnail(logoUrl);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Join Server')
        .setStyle(ButtonStyle.Link)
        .setURL(inviteUrl),
    );

    const thread = await channel.threads.create({
      name: title.slice(0, 100),
      message: { embeds: [embed], components: [row] },
    });

    await log(client, `📋 New directory listing: **${title}** by ${submitterUsername}`);
    return res.json({ success: true, threadId: thread.id });
  } catch (err) {
    console.error('[Directory] Error creating listing:', err);
    return res.status(500).json({ success: false, error: 'Failed to create directory listing.' });
  }
}

module.exports = { handleDirectory };
