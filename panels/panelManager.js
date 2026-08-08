// panels/panelManager.js — the panel lifecycle behind the /panel dashboard.
// sqlite is the source of truth: each panel type maps to a target channel and
// the last posted message id. Deploys are delete-and-resend so the newest
// embed code always shows (edits-in-place can't refresh attachments/buttons
// reliably). Only the bot's own messages are ever deleted, only in the
// panel's configured channel.
const { MessageFlags } = require('discord.js');
const { db } = require('../utils/appDb');
const { BUILDERS } = require('./renderPanel');

db.exec(`
  CREATE TABLE IF NOT EXISTS panel_config (
    panel_type TEXT PRIMARY KEY,
    channel_id TEXT,
    message_id TEXT,
    updated_at INTEGER NOT NULL
  );
`);

// One-time migration: seed channel/message mappings from the legacy
// posted_panels table (latest row per type) so already-posted panels are
// known to the dashboard.
{
  const seeded = db.prepare('SELECT COUNT(*) AS n FROM panel_config').get().n;
  if (seeded === 0) {
    const legacy = db.prepare(`
      SELECT panel_type, channel_id, message_id, MAX(posted_at) AS posted_at
      FROM posted_panels GROUP BY panel_type
    `).all();
    const insert = db.prepare(`
      INSERT OR IGNORE INTO panel_config (panel_type, channel_id, message_id, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    for (const row of legacy) insert.run(row.panel_type, row.channel_id, row.message_id, row.posted_at);
    if (legacy.length) console.log(`[PanelManager] Migrated ${legacy.length} legacy panel mapping(s).`);
  }
}

// Display metadata for the dashboard. Keys must match BUILDERS in renderPanel.
const PANEL_TYPES = [
  { type: 'dashboard',           label: 'Dashboard / Welcome' },
  { type: 'server-rules',        label: 'Server Rules' },
  { type: 'community',           label: 'Community' },
  { type: 'marketing-campaigns', label: 'Marketing Campaigns' },
  { type: 'get-started',         label: 'Get Started' },
  { type: 'trial-staff',         label: 'Trial Information' },
  { type: 'staff-promotions',    label: 'Staff Promotions' },
  { type: 'management-handbook', label: 'Management Handbook' },
  { type: 'staff-handbook',      label: 'Staff Handbook' },
  { type: 'pr-handbook',         label: 'PR Handbook' },
  { type: 'pr',                  label: 'PR Team Panel' },
];

function getPanelState(type) {
  return db.prepare('SELECT * FROM panel_config WHERE panel_type = ?').get(type) || null;
}

function getAllPanelStates() {
  const states = new Map();
  for (const row of db.prepare('SELECT * FROM panel_config').all()) states.set(row.panel_type, row);
  return states;
}

function setPanelChannel(type, channelId) {
  db.prepare(`
    INSERT INTO panel_config (panel_type, channel_id, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(panel_type) DO UPDATE SET channel_id = excluded.channel_id, updated_at = excluded.updated_at
  `).run(type, channelId, Math.floor(Date.now() / 1000));
}

function savePanelMessage(type, messageId) {
  db.prepare('UPDATE panel_config SET message_id = ?, updated_at = ? WHERE panel_type = ?')
    .run(messageId, Math.floor(Date.now() / 1000), type);
}

/**
 * Remove the previously posted panel from `channel`.
 * Tries the stored message id first; if that message is gone, falls back to a
 * tightly scoped purge: the bot's OWN messages among the channel's most
 * recent 25, at most 3 deletions. User messages are never touched.
 */
async function clearOldPanel(client, channel, state) {
  if (state?.message_id) {
    const old = await channel.messages.fetch(state.message_id).catch(() => null);
    if (old) {
      if (old.author?.id === client.user.id) await old.delete().catch(() => {});
      return;
    }
  }
  if (!state?.message_id) return; // never purge on a first deploy

  const recent = await channel.messages.fetch({ limit: 25 }).catch(() => null);
  if (!recent) return;
  let deleted = 0;
  for (const msg of recent.values()) {
    if (deleted >= 3) break;
    if (msg.author?.id !== client.user.id) continue;
    await msg.delete().catch(() => {});
    deleted++;
  }
  if (deleted) console.log(`[PanelManager] Purge fallback removed ${deleted} stale bot message(s) in ${channel.id}.`);
}

/**
 * Deploy one panel to its configured channel (delete-and-resend).
 * Returns { ok, action?: 'posted'|'replaced', error? }.
 */
async function deployPanel(client, type) {
  const builder = BUILDERS[type];
  if (!builder) return { ok: false, error: 'unknown panel type' };

  const state = getPanelState(type);
  if (!state?.channel_id) return { ok: false, error: 'no channel set' };

  const channel = await client.channels.fetch(state.channel_id).catch(() => null);
  if (!channel || !channel.isTextBased()) return { ok: false, error: 'channel missing or not accessible' };

  const hadMessage = !!state.message_id;
  await clearOldPanel(client, channel, state);

  let payload;
  try {
    const { components, files } = builder();
    payload = { components, files, flags: MessageFlags.IsComponentsV2 };
  } catch (err) {
    return { ok: false, error: `build failed: ${err.message}` };
  }

  try {
    const message = await channel.send(payload);
    savePanelMessage(type, message.id);
    return { ok: true, action: hadMessage ? 'replaced' : 'posted' };
  } catch (err) {
    return { ok: false, error: `send failed: ${err.message}` };
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * mode 'deploy': first-time post for every configured panel that has no
 *                stored message yet (already-posted panels are skipped).
 * mode 'update': delete-and-resend every configured panel.
 * Returns [{ type, label, ok, action?, skipped?, error? }].
 */
async function deployAll(client, mode) {
  const results = [];
  for (const meta of PANEL_TYPES) {
    const state = getPanelState(meta.type);
    if (!state?.channel_id) {
      results.push({ ...meta, ok: false, error: 'no channel set' });
      continue;
    }
    if (mode === 'deploy' && state.message_id) {
      results.push({ ...meta, ok: true, skipped: true });
      continue;
    }
    try {
      const result = await deployPanel(client, meta.type);
      results.push({ ...meta, ...result });
    } catch (err) {
      results.push({ ...meta, ok: false, error: err.message });
    }
    await sleep(600); // rate-limit courtesy between channels
  }
  return results;
}

module.exports = {
  PANEL_TYPES, getPanelState, getAllPanelStates, setPanelChannel,
  deployPanel, deployAll,
};
