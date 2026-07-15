// handlers/tools.js — RETIRED legacy push endpoint wrapper.
// The "tools" listing type is retired by default; re-enable by setting
// "KEEP_TOOLS_TYPE": true in config.json. See utils/postListing.js.
const { postListing } = require('../utils/postListing');

async function handleTool(client, req, res) {
  const { title, description, url, category, creator } = req.body;

  if (!title || !description || !url || !creator) {
    return res.status(400).json({ success: false, error: 'Missing required fields: title, description, url, creator.' });
  }

  try {
    const result = await postListing(client, 'tools', {
      id: req.body.id ?? null,
      title,
      shortDescription: category ? `${description}\n\n**Category:** ${category}` : description,
      authorUsername: creator,
      url,
    });

    if (!result.ok) {
      const status = result.error.startsWith('Unknown listing type') ? 410 : 500;
      return res.status(status).json({ success: false, error: status === 410 ? 'The tools listing type has been retired.' : result.error });
    }
    return res.json({ success: true, threadId: result.threadId });
  } catch (err) {
    console.error('[Tools] Error creating tool post:', err);
    return res.status(500).json({ success: false, error: 'Failed to create tool post.' });
  }
}

module.exports = { handleTool };
