const express = require('express');
const { EmbedBuilder, ChannelType } = require('discord.js');
const Anthropic = require('@anthropic-ai/sdk');
const apiAuth = require('../middleware/apiAuth');
const maintenance = require('../middleware/maintenance');
const config = require('../../config.json');

const router = express.Router();

// ─── POST /api/suggestion ─────────────────────────────────────────────────────
router.post('/suggestion', maintenance, apiAuth, async (req, res) => {
  const { username, discordId, category, title, details } = req.body;

  if (!username || !discordId || !category || !title || !details) {
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
  }

  try {
    const client = req.app.get('discordClient');
    const channel = await client.channels.fetch(config.channels.suggestions);
    if (!channel || channel.type !== ChannelType.GuildForum) {
      return res.status(500).json({ success: false, error: 'Suggestions forum channel not configured.' });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(title)
      .addFields(
        { name: 'Category', value: category, inline: true },
        { name: 'Submitted By', value: `${username} (<@${discordId}>)`, inline: true },
        { name: 'Details', value: details, inline: false },
      )
      .setTimestamp();

    const thread = await channel.threads.create({
      name: title.slice(0, 100),
      message: { embeds: [embed] },
    });

    res.json({ success: true, id: thread.id });
  } catch (err) {
    console.error('[API] /api/suggestion error:', err);
    res.status(500).json({ success: false, error: 'Failed to submit suggestion.' });
  }
});

// ─── POST /api/application ────────────────────────────────────────────────────
router.post('/application', maintenance, apiAuth, async (req, res) => {
  const { discordId, username, age, timezone, reason, experience, roleApplying } = req.body;

  if (!discordId || !username || !age || !timezone || !reason || !experience || !roleApplying) {
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
  }

  try {
    const client = req.app.get('discordClient');
    const channel = await client.channels.fetch(config.channels.applications);
    if (!channel || channel.type !== ChannelType.GuildForum) {
      return res.status(500).json({ success: false, error: 'Applications forum channel not configured.' });
    }

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('New Staff Application')
      .addFields(
        { name: 'Applicant', value: `${username} (<@${discordId}>)`, inline: true },
        { name: 'Role Applying For', value: roleApplying, inline: true },
        { name: 'Age', value: String(age), inline: true },
        { name: 'Timezone', value: timezone, inline: true },
        { name: 'Reason for Applying', value: reason, inline: false },
        { name: 'Experience', value: experience, inline: false },
      )
      .setTimestamp();

    const thread = await channel.threads.create({
      name: `${roleApplying} — ${username}`.slice(0, 100),
      message: { embeds: [embed] },
    });

    res.json({ success: true, id: thread.id });
  } catch (err) {
    console.error('[API] /api/application error:', err);
    res.status(500).json({ success: false, error: 'Failed to submit application.' });
  }
});

// ─── POST /api/partnership ────────────────────────────────────────────────────
router.post('/partnership', maintenance, apiAuth, async (req, res) => {
  const { serverName, inviteLink, serverType, reason, offering } = req.body;

  if (!serverName || !inviteLink || !serverType || !reason || !offering) {
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
  }

  try {
    const client = req.app.get('discordClient');
    const channel = await client.channels.fetch(config.channels.partnerships);
    if (!channel || channel.type !== ChannelType.GuildForum) {
      return res.status(500).json({ success: false, error: 'Partnerships forum channel not configured.' });
    }

    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle('New Partnership Request')
      .addFields(
        { name: 'Server Name', value: serverName, inline: true },
        { name: 'Server Type', value: serverType, inline: true },
        { name: 'Invite Link', value: inviteLink, inline: false },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Offering', value: offering, inline: false },
      )
      .setTimestamp();

    const thread = await channel.threads.create({
      name: serverName.slice(0, 100),
      message: { embeds: [embed] },
    });

    res.json({ success: true, id: thread.id });
  } catch (err) {
    console.error('[API] /api/partnership error:', err);
    res.status(500).json({ success: false, error: 'Failed to submit partnership request.' });
  }
});

// ─── POST /api/ai-chat ────────────────────────────────────────────────────────
router.post('/ai-chat', maintenance, async (req, res) => {
  if (process.env.AI_BETA_MODE === 'true') {
    const betaToken = req.headers['x-beta-token'];
    const validTokens = (process.env.AI_BETA_TOKENS || '').split(',').map(t => t.trim()).filter(Boolean);
    if (!betaToken || !validTokens.includes(betaToken)) {
      return res.status(403).json({ success: false, error: 'AI assistant is currently in beta. A valid X-BETA-TOKEN is required.' });
    }
  }

  const { messages, options } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, error: 'Missing or invalid messages array.' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ success: false, error: 'AI assistant is not configured on this server.' });
  }

  const systemPrompt = `You are the HowToERLC AI Assistant — a specialized helper for ERLC (Emergency Response: Liberty County) community builders and server owners.

You ONLY answer questions related to:
- ERLC community building and management
- Discord server setup for ERLC communities (channels, roles, bots, moderation)
- Graphic design for ERLC servers (logos, banners, rank graphics, liveries)
- Web design for ERLC community websites
- Department structures (patrol, fire, EMS, dispatch, command hierarchies)
- Livery design and vehicle customization in ERLC
- CAD/MDT systems for ERLC (Computer Aided Dispatch, Mobile Data Terminals)
- Staff management and training programs for ERLC servers
- Event planning and hosting for ERLC communities
- Partnership strategies between ERLC servers
- Growing and moderating ERLC Discord communities
- Roblox game mechanics relevant to ERLC

If someone asks about anything outside of these topics, politely decline and redirect them. Say something like: "I'm specifically designed to help with ERLC community building topics. For that, you'd be better served by a general-purpose assistant. Is there anything ERLC-related I can help you with?"

Be helpful, clear, and professional. Format responses with bullet points or headers when useful.`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      ...(options || {}),
    });

    const content = response.content[0].text;
    res.json({ success: true, content });
  } catch (err) {
    console.error('[API] /api/ai-chat error:', err);
    res.status(500).json({ success: false, error: 'Failed to get a response from the AI assistant.' });
  }
});

module.exports = router;
