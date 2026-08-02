// utils/stickyManager.js — keeps each configured sticky as the LAST message in
// its channel. Reposts are debounced (wait after the last message) and rate
// limited (never more than once per 10s per channel). State persists in the
// shared sqlite db. Copy lives in utils/stickyContent.js.
//
// Safety rules: the bot only ever deletes ITS OWN previous sticky message,
// and every Discord call is caught so a missing channel or permission can
// only produce a warning, never a crash.
const {
  ContainerBuilder, TextDisplayBuilder, MessageFlags, resolveColor,
} = require('discord.js');
const config = require('../config.json');
const { db } = require('./appDb');
const { STICKY_CHANNELS, getStickyEntry } = require('./stickyContent');

const DEBOUNCE_MS = 4000;        // wait this long after the last message
const MIN_INTERVAL_MS = 10_000;  // hard floor between reposts per channel

db.exec(`
  CREATE TABLE IF NOT EXISTS sticky_state (
    channel_id TEXT PRIMARY KEY,
    enabled    INTEGER NOT NULL DEFAULT 0,
    message_id TEXT
  );
`);

// channelId → { timer, lastRepost } (in-memory debounce bookkeeping)
const channels = new Map();

function bookkeeping(channelId) {
  let entry = channels.get(channelId);
  if (!entry) { entry = { timer: null, lastRepost: 0 }; channels.set(channelId, entry); }
  return entry;
}

// ── State ─────────────────────────────────────────────────────────────────────

function getState(channelId) {
  return db.prepare('SELECT * FROM sticky_state WHERE channel_id = ?').get(String(channelId)) || null;
}

function isEnabled(channelId) {
  const row = getState(channelId);
  return !!row && row.enabled === 1;
}

function setEnabled(channelId, enabled) {
  db.prepare(`
    INSERT INTO sticky_state (channel_id, enabled) VALUES (?, ?)
    ON CONFLICT(channel_id) DO UPDATE SET enabled = excluded.enabled
  `).run(String(channelId), enabled ? 1 : 0);
}

function saveMessageId(channelId, messageId) {
  db.prepare('UPDATE sticky_state SET message_id = ? WHERE channel_id = ?')
    .run(messageId, String(channelId));
}

// ── Message payload ───────────────────────────────────────────────────────────

function buildStickyPayload(entry) {
  const container = new ContainerBuilder()
    .setAccentColor(resolveColor(config.colors.primary || '#4ade80'))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(entry.content.slice(0, 3900)));
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// ── Core repost / remove ──────────────────────────────────────────────────────

/** Delete the bot's previous sticky (never anything else) and post a fresh one. */
async function repostNow(client, channelId) {
  const entry = getStickyEntry(channelId);
  if (!entry) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    console.warn(`[Sticky] Channel ${channelId} (${entry.label}) not found or not accessible.`);
    return;
  }

  const book = bookkeeping(channelId);
  book.lastRepost = Date.now();

  const state = getState(channelId);
  if (state?.message_id) {
    const old = await channel.messages.fetch(state.message_id).catch(() => null);
    if (old && old.author?.id === client.user.id) await old.delete().catch(() => {});
  }

  try {
    const msg = await channel.send(buildStickyPayload(entry));
    saveMessageId(channelId, msg.id);
  } catch (err) {
    console.warn(`[Sticky] Could not post sticky in ${entry.label} (${channelId}): ${err.message}`);
  }
}

/** Remove the bot's sticky from a channel (used when toggling off). */
async function removeSticky(client, channelId) {
  const book = bookkeeping(channelId);
  if (book.timer) { clearTimeout(book.timer); book.timer = null; }

  const state = getState(channelId);
  if (!state?.message_id) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (channel) {
    const old = await channel.messages.fetch(state.message_id).catch(() => null);
    if (old && old.author?.id === client.user.id) await old.delete().catch(() => {});
  }
  saveMessageId(channelId, null);
}

// ── Debounced trigger (called from messageCreate) ─────────────────────────────

function scheduleRepost(client, channelId) {
  const book = bookkeeping(channelId);
  if (book.timer) clearTimeout(book.timer);

  // Debounce after the last message, but never fire sooner than the 10s floor
  const sinceLast = Date.now() - book.lastRepost;
  const delay = Math.max(DEBOUNCE_MS, MIN_INTERVAL_MS - sinceLast);

  book.timer = setTimeout(() => {
    book.timer = null;
    repostNow(client, channelId).catch(err =>
      console.warn(`[Sticky] Repost failed for ${channelId}: ${err.message}`));
  }, delay);
}

function onMessage(message, client) {
  if (!message.guild) return;
  if (message.author?.id === client.user.id) return; // never react to our own posts
  if (!isEnabled(message.channel.id)) return;
  if (!getStickyEntry(message.channel.id)) return;
  scheduleRepost(client, message.channel.id);
}

// ── Toggle API (used by the /sticky panel) ────────────────────────────────────

async function enableSticky(client, channelId) {
  setEnabled(channelId, true);
  await repostNow(client, channelId);
}

async function disableSticky(client, channelId) {
  setEnabled(channelId, false);
  await removeSticky(client, channelId);
}

// ── Startup sweep ─────────────────────────────────────────────────────────────

/** Re-post stickies in enabled channels where ours is no longer last. */
async function startupSweep(client) {
  for (const entry of STICKY_CHANNELS) {
    try {
      if (!isEnabled(entry.channelId)) continue;
      const channel = await client.channels.fetch(entry.channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        console.warn(`[Sticky] Startup: channel ${entry.channelId} (${entry.label}) not accessible.`);
        continue;
      }
      const state = getState(entry.channelId);
      const last = (await channel.messages.fetch({ limit: 1 }).catch(() => null))?.first();
      if (!last || last.id !== state?.message_id) {
        await repostNow(client, entry.channelId);
        console.log(`[Sticky] Startup: re-posted sticky in ${entry.label}.`);
      }
    } catch (err) {
      console.warn(`[Sticky] Startup sweep error for ${entry.label}: ${err.message}`);
    }
  }
}

module.exports = {
  onMessage, enableSticky, disableSticky, isEnabled, startupSweep,
  repostNow, removeSticky,
};
