const express = require('express');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const apiAuth = require('../middleware/apiAuth');
const maintenance = require('../middleware/maintenance');
const config = require('../../config.json');

const router = express.Router();
const dataPath = (file) => path.join(__dirname, '..', '..', 'data', file);

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(dataPath(file), 'utf8')); } catch { return []; }
}
function writeJSON(file, data) {
  fs.writeFileSync(dataPath(file), JSON.stringify(data, null, 2));
}

// In-memory session store for AI chat (last 5 messages per session)
const chatSessions = new Map();

// ─── POST /api/application ────────────────────────────────────────────────────
router.post('/application', maintenance, apiAuth, async (req, res) => {
  const { discordId, username, age, timezone, reason, experience, roleApplying } = req.body;

  if (!discordId || !username || !age || !timezone || !reason || !experience || !roleApplying) {
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
  }

  const client = req.app.get('discordClient');
  const guild = client.guilds.cache.get(config.guildId);
  if (!guild) return res.status(500).json({ success: false, error: 'Discord guild not found.' });

  const appChannel = guild.channels.cache.get(config.channels.applications);
  if (!appChannel) return res.status(500).json({ success: false, error: 'Applications channel not configured.' });

  const submissionId = crypto.randomUUID();
  const application = {
    id: submissionId,
    discordId,
    username,
    age,
    timezone,
    reason,
    experience,
    roleApplying,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };

  const applications = readJSON('applications.json');
  applications.push(application);
  writeJSON('applications.json', applications);

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('📋 New Staff Application')
    .setDescription(`A new application has been submitted via the HowToERLC website.`)
    .addFields(
      { name: '👤 Applicant', value: `${username} (<@${discordId}>)`, inline: true },
      { name: '🎯 Role', value: roleApplying, inline: true },
      { name: '🎂 Age', value: age.toString(), inline: true },
      { name: '🕐 Timezone', value: timezone, inline: true },
      { name: '📝 Reason for Applying', value: reason, inline: false },
      { name: '⭐ Experience', value: experience, inline: false },
      { name: '🆔 Submission ID', value: submissionId, inline: false },
    )
    .setFooter({ text: 'HowToERLC Staff Applications • howtoerlc.xyz' })
    .setTimestamp();

  const acceptBtn = new ButtonBuilder()
    .setCustomId(`app:accept:${submissionId}`)
    .setLabel('✅ Accept')
    .setStyle(ButtonStyle.Success);

  const denyBtn = new ButtonBuilder()
    .setCustomId(`app:deny:${submissionId}`)
    .setLabel('❌ Deny')
    .setStyle(ButtonStyle.Danger);

  await appChannel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(acceptBtn, denyBtn)],
  });

  res.json({ success: true, message: 'Application submitted successfully.', id: submissionId });
});

// ─── POST /api/suggestion ─────────────────────────────────────────────────────
router.post('/suggestion', maintenance, apiAuth, async (req, res) => {
  const { username, discordId, category, title, details } = req.body;

  if (!username || !discordId || !category || !title || !details) {
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
  }

  const client = req.app.get('discordClient');
  const guild = client.guilds.cache.get(config.guildId);
  if (!guild) return res.status(500).json({ success: false, error: 'Discord guild not found.' });

  const suggestChannel = guild.channels.cache.get(config.channels.suggestions);
  if (!suggestChannel) return res.status(500).json({ success: false, error: 'Suggestions channel not configured.' });

  const submissionId = crypto.randomUUID();
  const suggestion = {
    id: submissionId,
    discordId,
    username,
    category,
    title,
    details,
    status: 'pending',
    votes: { up: [], down: [] },
    submittedAt: new Date().toISOString(),
  };

  const suggestions = readJSON('suggestions.json');
  suggestions.push(suggestion);
  writeJSON('suggestions.json', suggestions);

  const embed = new EmbedBuilder()
    .setColor(config.colors.info)
    .setTitle(`💡 Suggestion: ${title}`)
    .setDescription(details)
    .addFields(
      { name: '👤 Submitted By', value: `${username} (<@${discordId}>)`, inline: true },
      { name: '🏷️ Category', value: category, inline: true },
      { name: '📊 Votes', value: '👍 0  •  👎 0', inline: false },
    )
    .setFooter({ text: `ID: ${submissionId} • HowToERLC Suggestions` })
    .setTimestamp();

  const upvoteBtn = new ButtonBuilder()
    .setCustomId(`suggestion:upvote:${submissionId}`)
    .setLabel('👍 Upvote')
    .setStyle(ButtonStyle.Success);

  const downvoteBtn = new ButtonBuilder()
    .setCustomId(`suggestion:downvote:${submissionId}`)
    .setLabel('👎 Downvote')
    .setStyle(ButtonStyle.Danger);

  const approveBtn = new ButtonBuilder()
    .setCustomId(`suggestion:approve:${submissionId}`)
    .setLabel('✅ Approve')
    .setStyle(ButtonStyle.Primary);

  const declineBtn = new ButtonBuilder()
    .setCustomId(`suggestion:decline:${submissionId}`)
    .setLabel('❌ Decline')
    .setStyle(ButtonStyle.Secondary);

  const msg = await suggestChannel.send({
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(upvoteBtn, downvoteBtn),
      new ActionRowBuilder().addComponents(approveBtn, declineBtn),
    ],
  });

  // Auto-create discussion thread
  try {
    await msg.startThread({
      name: `Discussion: ${title}`.slice(0, 100),
      autoArchiveDuration: 1440,
      reason: 'Auto discussion thread for suggestion',
    });
  } catch {
    // Thread creation is best-effort; channel may not support it
  }

  res.json({ success: true, message: 'Suggestion submitted successfully.', id: submissionId });
});

// ─── POST /api/partnership ────────────────────────────────────────────────────
router.post('/partnership', maintenance, apiAuth, async (req, res) => {
  const { serverName, inviteLink, serverType, reason, offering, contactId } = req.body;

  if (!serverName || !inviteLink || !serverType || !reason || !offering) {
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
  }

  const client = req.app.get('discordClient');
  const guild = client.guilds.cache.get(config.guildId);
  if (!guild) return res.status(500).json({ success: false, error: 'Discord guild not found.' });

  const partnerChannel = guild.channels.cache.get(config.channels.partnerships);
  if (!partnerChannel) return res.status(500).json({ success: false, error: 'Partnerships channel not configured.' });

  const submissionId = crypto.randomUUID();
  const partnership = {
    id: submissionId,
    serverName,
    inviteLink,
    serverType,
    reason,
    offering,
    contactId: contactId || null,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };

  const partnerships = readJSON('partnerships.json');
  partnerships.push(partnership);
  writeJSON('partnerships.json', partnerships);

  const pingRole = config.roles.notifications?.partnerships;
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🤝 New Partnership Request')
    .setDescription(`A new partnership request has been submitted via the HowToERLC website.`)
    .addFields(
      { name: '🏠 Server Name', value: serverName, inline: true },
      { name: '📌 Server Type', value: serverType, inline: true },
      { name: '🔗 Invite Link', value: inviteLink, inline: false },
      { name: '💬 Reason for Partnership', value: reason, inline: false },
      { name: '🎁 What They\'re Offering', value: offering, inline: false },
      { name: '🆔 Submission ID', value: submissionId, inline: false },
    )
    .setFooter({ text: 'HowToERLC Partnerships • howtoerlc.xyz' })
    .setTimestamp();

  const approveBtn = new ButtonBuilder()
    .setCustomId(`partnership:approve:${submissionId}`)
    .setLabel('✅ Approve')
    .setStyle(ButtonStyle.Success);

  const denyBtn = new ButtonBuilder()
    .setCustomId(`partnership:deny:${submissionId}`)
    .setLabel('❌ Deny')
    .setStyle(ButtonStyle.Danger);

  await partnerChannel.send({
    content: pingRole ? `<@&${pingRole}>` : undefined,
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(approveBtn, denyBtn)],
  });

  res.json({ success: true, message: 'Partnership request submitted successfully.', id: submissionId });
});

// ─── POST /api/ai-chat ────────────────────────────────────────────────────────
router.post('/ai-chat', maintenance, async (req, res) => {
  // Beta mode gating
  if (process.env.AI_BETA_MODE === 'true') {
    const betaToken = req.headers['x-beta-token'];
    const validTokens = (process.env.AI_BETA_TOKENS || '').split(',').map(t => t.trim()).filter(Boolean);
    if (!betaToken || !validTokens.includes(betaToken)) {
      return res.status(403).json({ success: false, error: 'AI assistant is currently in beta. A valid X-BETA-TOKEN is required.' });
    }
  }

  const { message, sessionId } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Missing or empty message.' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ success: false, error: 'AI assistant is not configured on this server.' });
  }

  const sid = sessionId || crypto.randomUUID();
  if (!chatSessions.has(sid)) chatSessions.set(sid, []);

  const history = chatSessions.get(sid);
  history.push({ role: 'user', content: message.trim() });

  // Keep last 5 exchanges (10 messages)
  const trimmed = history.slice(-10);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

If someone asks about ANYTHING outside of these topics — including but not limited to: general coding, other games, real-world events, personal advice, politics, or any topic unrelated to ERLC community building — you must politely decline and redirect them.

When declining, say something like: "I'm specifically designed to help with ERLC community building topics. For [their topic], you'd be better served by a general-purpose assistant. Is there anything ERLC-related I can help you with?"

Be helpful, clear, and friendly. Format responses with bullet points or headers when useful. Keep answers focused and actionable.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: trimmed,
    });

    const reply = response.content[0].text;
    history.push({ role: 'assistant', content: reply });

    // Trim session to 10 messages
    if (history.length > 10) history.splice(0, history.length - 10);

    res.json({ success: true, reply, sessionId: sid });
  } catch (err) {
    console.error('[AI Chat] Anthropic error:', err);
    res.status(500).json({ success: false, error: 'Failed to get a response from the AI assistant.' });
  }
});

module.exports = router;
