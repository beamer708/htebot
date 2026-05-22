// handlers/marketplace.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');
const { log } = require('./logger');

async function handleMarketplace(client, req, res) {
  const { title, description, price, sellerUsername, contactUrl } = req.body;

  if (!title || !description || !price || !sellerUsername || !contactUrl) {
    return res.status(400).json({ success: false, error: 'Missing required fields: title, description, price, sellerUsername, contactUrl.' });
  }

  try {
    const channel = await client.channels.fetch(config.channels.marketplace).catch(() => null);
    if (!channel) return res.status(500).json({ success: false, error: 'Marketplace channel not found.' });

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0xFF6B6B)
      .addFields(
        { name: 'Price',  value: price,          inline: true },
        { name: 'Seller', value: sellerUsername, inline: true },
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Contact Seller')
        .setStyle(ButtonStyle.Link)
        .setURL(contactUrl),
    );

    const thread = await channel.threads.create({
      name: title.slice(0, 100),
      message: { embeds: [embed], components: [row] },
    });

    await log(client, `🛒 New marketplace listing: **${title}** by ${sellerUsername} — ${price}`);
    return res.json({ success: true, threadId: thread.id });
  } catch (err) {
    console.error('[Marketplace] Error creating listing:', err);
    return res.status(500).json({ success: false, error: 'Failed to create marketplace listing.' });
  }
}

module.exports = { handleMarketplace };
