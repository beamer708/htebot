// handlers/marketplace.js — legacy push endpoint wrapper (see utils/postListing.js)
const { postListing } = require('../utils/postListing');

async function handleMarketplace(client, req, res) {
  const { title, description, price, sellerUsername, contactUrl } = req.body;

  if (!title || !description || !price || !sellerUsername || !contactUrl) {
    return res.status(400).json({ success: false, error: 'Missing required fields: title, description, price, sellerUsername, contactUrl.' });
  }

  try {
    const result = await postListing(client, 'marketplace', {
      id: req.body.id ?? null,
      title,
      shortDescription: `${description}\n\n**Price:** ${price}`,
      authorUsername: sellerUsername,
      url: contactUrl,
    });

    if (!result.ok) return res.status(500).json({ success: false, error: result.error });
    return res.json({ success: true, threadId: result.threadId });
  } catch (err) {
    console.error('[Marketplace] Error creating listing:', err);
    return res.status(500).json({ success: false, error: 'Failed to create marketplace listing.' });
  }
}

module.exports = { handleMarketplace };
