// handlers/resources.js — legacy push endpoint wrapper (see utils/postListing.js)
const { postListing } = require('../utils/postListing');

async function handleResource(client, req, res) {
  const { title, description, url, type, category, creator } = req.body;

  if (!title || !description || !url || !creator) {
    return res.status(400).json({ success: false, error: 'Missing required fields: title, description, url, creator.' });
  }

  try {
    const extras = [type && `**Type:** ${type}`, category && `**Category:** ${category}`].filter(Boolean).join(' · ');
    const result = await postListing(client, 'resources', {
      id: req.body.id ?? null,
      title,
      shortDescription: extras ? `${description}\n\n${extras}` : description,
      authorUsername: creator,
      url,
    });

    if (!result.ok) return res.status(500).json({ success: false, error: result.error });
    return res.json({ success: true, threadId: result.threadId });
  } catch (err) {
    console.error('[Resources] Error creating resource:', err);
    return res.status(500).json({ success: false, error: 'Failed to create resource post.' });
  }
}

module.exports = { handleResource };
