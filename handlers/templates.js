// handlers/templates.js — legacy push endpoint wrapper (see utils/postListing.js)
const { postListing } = require('../utils/postListing');

async function handleTemplate(client, req, res) {
  const { title, description, url, category, creator } = req.body;

  if (!title || !description || !url || !creator) {
    return res.status(400).json({ success: false, error: 'Missing required fields: title, description, url, creator.' });
  }

  try {
    const result = await postListing(client, 'templates', {
      id: req.body.id ?? null,
      title,
      shortDescription: category ? `${description}\n\n**Category:** ${category}` : description,
      authorUsername: creator,
      url,
    });

    if (!result.ok) return res.status(500).json({ success: false, error: result.error });
    return res.json({ success: true, threadId: result.threadId });
  } catch (err) {
    console.error('[Templates] Error creating template post:', err);
    return res.status(500).json({ success: false, error: 'Failed to create template post.' });
  }
}

module.exports = { handleTemplate };
