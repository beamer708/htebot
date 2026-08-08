// utils/moderationListing.js — posts pending listings into the moderation forum
// as Components V2 review cards, and tracks their review lifecycle in SQLite.
// Contract: BOT_API_CONTRACT.md
const {
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder,
  SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  MessageFlags, resolveColor,
} = require('discord.js');
const config = require('../config.json');
const { db } = require('./appDb');
const { LISTING_TYPES } = require('./postListing');

db.exec(`
  CREATE TABLE IF NOT EXISTS moderation_listings (
    listing_id           TEXT PRIMARY KEY,
    data                 TEXT NOT NULL,
    moderation_thread_id TEXT,
    status               TEXT NOT NULL DEFAULT 'pending',
    public_thread_id     TEXT,
    reviewed_by          TEXT,
    reviewed_at          INTEGER,
    deny_reason          TEXT,
    created_at           INTEGER NOT NULL
  );
`);

function getModerationRecord(listingId) {
  const row = db.prepare('SELECT * FROM moderation_listings WHERE listing_id = ?').get(String(listingId));
  if (!row) return null;
  try { row.listing = JSON.parse(row.data); } catch { row.listing = null; }
  return row;
}

function saveModerationRecord(listing, threadId) {
  db.prepare(`
    INSERT OR IGNORE INTO moderation_listings (listing_id, data, moderation_thread_id, status, created_at)
    VALUES (?, ?, ?, 'pending', ?)
  `).run(String(listing.id), JSON.stringify(listing), threadId || null, Math.floor(Date.now() / 1000));
}

function setPublicThread(listingId, publicThreadId) {
  db.prepare('UPDATE moderation_listings SET public_thread_id = ? WHERE listing_id = ?')
    .run(publicThreadId, String(listingId));
}

function setReviewed(listingId, status, reviewedBy, denyReason) {
  db.prepare(`
    UPDATE moderation_listings
    SET status = ?, reviewed_by = ?, reviewed_at = ?, deny_reason = ?
    WHERE listing_id = ?
  `).run(status, reviewedBy, Math.floor(Date.now() / 1000), denyReason || null, String(listingId));
}

/**
 * Build the Components V2 review card for the moderation forum.
 * outcome: null (pending, buttons active) or
 *          { status: 'approved'|'denied', by, at, publicThreadId?, reason? }
 */
function buildReviewCard(listing, outcome = null) {
  const meta = LISTING_TYPES[listing.type];
  const accent = outcome
    ? (outcome.status === 'approved' ? resolveColor(config.colors.success) : resolveColor('#ED4245'))
    : resolveColor('#FEE75C');

  const container = new ContainerBuilder().setAccentColor(accent);

  const headerLines = [
    '## <:alerttriangle:1507191481906106398> Listing Review',
    `**${listing.title}**`,
    `-# Type: \`${listing.type}\`${meta ? '' : ' (⚠ unknown type)'} • Submitted ${listing.createdAt ? `<t:${Math.floor(new Date(listing.createdAt).getTime() / 1000)}:R>` : 'just now'}`,
  ].join('\n');

  const bodyLines = [];
  if (listing.shortDescription) bodyLines.push(listing.shortDescription.slice(0, 1000));
  if (listing.fullDescription && listing.fullDescription !== listing.shortDescription) {
    bodyLines.push(`>>> ${String(listing.fullDescription).slice(0, 600)}`);
  }
  bodyLines.push(
    [
      `<:Link:1507191523094167573> ${listing.url}`,
      listing.authorUsername ? `<:usercheck:1507191543952310404> Author: **${listing.authorUsername}**` : null,
      listing.submitterDiscordId ? `- Submitter: <@${listing.submitterDiscordId}>` : null,
    ].filter(Boolean).join('\n')
  );
  const bodyText = `${headerLines}\n\n${bodyLines.join('\n\n')}`.slice(0, 3800);

  if (listing.thumbnailUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(bodyText))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(listing.thumbnailUrl))
    );
  } else {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(bodyText));
  }

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  if (outcome) {
    const statusLine = outcome.status === 'approved'
      ? `<:circlecheck:1507191508066107532> **Approved** by <@${outcome.by}> <t:${outcome.at}:f>${outcome.publicThreadId ? ` — live in <#${outcome.publicThreadId}>` : ''}`
      : `<:circlex:1507191508657508503> **Denied** by <@${outcome.by}> <t:${outcome.at}:f>\n-# Reason: ${outcome.reason || 'No reason provided.'}`;
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(statusLine));
  }

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`listing_approve_${listing.id}`)
        .setLabel('Approve')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!!outcome),
      new ButtonBuilder()
        .setCustomId(`listing_deny_${listing.id}`)
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!!outcome),
    )
  );

  return container;
}

/**
 * Post a pending listing into the moderation forum as a review card.
 * Returns { ok, threadId?, error?, skipped? }
 */
async function postListingForReview(client, listing) {
  if (!listing || listing.id == null || !listing.title || !listing.url) {
    return { ok: false, error: `Listing ${listing?.id ?? '(no id)'} is missing required fields (id, title, url)` };
  }

  const existing = getModerationRecord(listing.id);
  if (existing) {
    return { ok: true, skipped: true, threadId: existing.moderation_thread_id };
  }

  const forumId = config.moderationForum;
  const channel = await client.channels.fetch(forumId).catch(() => null);
  if (!channel) {
    return { ok: false, error: `Moderation forum ${forumId} not found or not accessible` };
  }

  const card = buildReviewCard(listing);
  const thread = await channel.threads.create({
    name: `[${listing.type}] ${listing.title}`.slice(0, 100),
    message: { components: [card], flags: MessageFlags.IsComponentsV2 },
  });

  saveModerationRecord(listing, thread.id);
  return { ok: true, threadId: thread.id };
}

/** Website API helper — returns null when not configured. */
function getWebsiteApi() {
  const baseUrl = (process.env.WEBSITE_API_URL || '').replace(/\/$/, '');
  const secret  = process.env.LISTINGS_API_SECRET;
  if (!baseUrl || !secret) return null;
  return { baseUrl, secret };
}

/** Test listings from /showcase-test never sync with the website. */
function isTestListing(listingId) {
  return String(listingId).startsWith('test-');
}

module.exports = {
  buildReviewCard, postListingForReview,
  getModerationRecord, saveModerationRecord, setPublicThread, setReviewed,
  getWebsiteApi, isTestListing,
};
