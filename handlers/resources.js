// handlers/resources.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { log } = require('./logger');

async function handleResource(client, req, res) {
  const { title, description, url, type, category, creator } = req.body;

  if (!title || !description || !url || !type || !category || !creator) {
    return res.status(400).json({ success: false, error: 'Missing required fields: title, description, url, type, category, creator.' });
  }

  try {
    const channel = await client.channels.fetch(process.env.CHANNEL_RESOURCES).catch(() => null);
    if (!channel) return res.status(500).json({ success: false, error: 'Resources channel not found.' });

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0x5B8AF5)
      .addFields(
        { name: 'Type',     value: type,     inline: true },
        { name: 'Category', value: category, inline: true },
        { name: 'Creator',  value: creator,  inline: true },
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('View Resource')
        .setStyle(ButtonStyle.Link)
        .setURL(url),
    );

    const thread = await channel.threads.create({
      name: title.slice(0, 100),
      message: { embeds: [embed], components: [row] },
    });

    await log(client, `📚 New resource posted: **${title}** (${type})`);
    return res.json({ success: true, threadId: thread.id });
  } catch (err) {
    console.error('[Resources] Error creating resource:', err);
    return res.status(500).json({ success: false, error: 'Failed to create resource post.' });
  }
}

module.exports = { handleResource };
