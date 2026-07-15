// handlers/directory.js — legacy push endpoint wrapper (see utils/postListing.js)
const { postListing } = require('../utils/postListing');

async function handleDirectory(client, req, res) {
  const { title, description, inviteUrl, logoUrl, category, submitterUsername } = req.body;

  if (!title || !description || !inviteUrl || !submitterUsername) {
    return res.status(400).json({ success: false, error: 'Missing required fields: title, description, inviteUrl, submitterUsername.' });
  }

  try {
    const result = await postListing(client, 'directory', {
      id: req.body.id ?? null,
      title,
      shortDescription: category ? `${description}\n\n**Category:** ${category}` : description,
      authorUsername: submitterUsername,
      thumbnailUrl: logoUrl,
      url: inviteUrl,
    });

    if (!result.ok) return res.status(500).json({ success: false, error: result.error });
    return res.json({ success: true, threadId: result.threadId });
  } catch (err) {
    console.error('[Directory] Error creating listing:', err);
    return res.status(500).json({ success: false, error: 'Failed to create directory listing.' });
  }
}

module.exports = { handleDirectory };
