// handlers/tools.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { log } = require('./logger');

async function handleTool(client, req, res) {
  const { title, description, url, category, creator } = req.body;

  if (!title || !description || !url || !category || !creator) {
    return res.status(400).json({ success: false, error: 'Missing required fields: title, description, url, category, creator.' });
  }

  try {
    const channel = await client.channels.fetch(process.env.CHANNEL_TOOLS).catch(() => null);
    if (!channel) return res.status(500).json({ success: false, error: 'Tools channel not found.' });

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0xA78BFA)
      .addFields(
        { name: 'Category', value: category, inline: true },
        { name: 'Creator',  value: creator,  inline: true },
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Open Tool')
        .setStyle(ButtonStyle.Link)
        .setURL(url),
    );

    const thread = await channel.threads.create({
      name: title.slice(0, 100),
      message: { embeds: [embed], components: [row] },
    });

    await log(client, `🔧 New tool posted: **${title}**`);
    return res.json({ success: true, threadId: thread.id });
  } catch (err) {
    console.error('[Tools] Error creating tool post:', err);
    return res.status(500).json({ success: false, error: 'Failed to create tool post.' });
  }
}

module.exports = { handleTool };
