const {
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder,
  SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');
const config = require('../config.json');
const { db } = require('./appDb');
const { log } = require('../handlers/logger');

db.exec(`
  CREATE TABLE IF NOT EXISTS posted_listings (
    listing_id TEXT PRIMARY KEY,
    thread_id  TEXT,
    posted_at  INTEGER NOT NULL
  );
`);

// Per-type presentation. Channel IDs live in config.json → channels.
const LISTING_TYPES = {
  marketplace: { channelKey: 'marketplace', color: 0xFF6B6B, buttonLabel: 'Contact Seller',    logEmoji: '🛒', logLabel: 'marketplace listing' },
  resources:   { channelKey: 'resources',   color: 0x5B8AF5, buttonLabel: 'View Resource',     logEmoji: '📚', logLabel: 'resource' },
  templates:   { channelKey: 'templates',   color: 0xFFC400, buttonLabel: 'Download Template', logEmoji: '📄', logLabel: 'template' },
  directory:   { channelKey: 'directory',   color: 0x52D973, buttonLabel: 'Join Server',       logEmoji: '📋', logLabel: 'directory listing' },
  assets:      { channelKey: 'assets',      color: 0x38BDF8, buttonLabel: 'View Asset',        logEmoji: '🎨', logLabel: 'asset' },
  guides:      { channelKey: 'guides',      color: 0x4ADE80, buttonLabel: 'Read Guide',        logEmoji: '📖', logLabel: 'guide' },
};

// Legacy type — retired unless explicitly kept via config flag
if (config.KEEP_TOOLS_TYPE === true) {
  LISTING_TYPES.tools = { channelKey: 'tools', color: 0xA78BFA, buttonLabel: 'Open Tool', logEmoji: '🔧', logLabel: 'tool' };
}

/**
 * Components V2 public showcase card — shared by the poller-approved public
 * post and any place that needs the "live listing" look.
 */
function buildListingCard(listing, meta) {
  const container = new ContainerBuilder().setAccentColor(meta.color);

  const created = listing.createdAt ? new Date(listing.createdAt) : new Date();
  const textLines = [
    `## ${listing.title.slice(0, 200)}`,
    listing.authorUsername ? `-# by **${listing.authorUsername}**` : null,
    listing.shortDescription ? `\n${listing.shortDescription.slice(0, 2000)}` : null,
    `\n-# Posted <t:${Math.floor(created.getTime() / 1000)}:R>`,
  ].filter(Boolean).join('\n');

  if (listing.thumbnailUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(textLines))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(listing.thumbnailUrl))
    );
  } else {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(textLines));
  }

  container
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel(meta.buttonLabel || 'View More')
          .setStyle(ButtonStyle.Link)
          .setURL(listing.url),
      )
    );

  return container;
}

function isListingPosted(listingId) {
  return !!db.prepare('SELECT 1 FROM posted_listings WHERE listing_id = ?').get(String(listingId));
}

function markListingPosted(listingId, threadId) {
  db.prepare('INSERT OR IGNORE INTO posted_listings (listing_id, thread_id, posted_at) VALUES (?, ?, ?)')
    .run(String(listingId), threadId || null, Math.floor(Date.now() / 1000));
}

/**
 * Post a listing to its forum channel.
 * listing: { id, type, title, shortDescription, authorUsername, authorAvatarUrl, thumbnailUrl, url, createdAt }
 * Returns { ok, threadId?, error?, skipped? }
 */
async function postListing(client, type, listing) {
  const meta = LISTING_TYPES[type];
  if (!meta) {
    return { ok: false, error: `Unknown listing type "${type}"` };
  }

  if (!listing || !listing.title || !listing.url) {
    return { ok: false, error: `Listing ${listing?.id ?? '(no id)'} is missing required fields (title, url)` };
  }

  if (listing.id != null && isListingPosted(listing.id)) {
    return { ok: true, skipped: true, error: `Listing ${listing.id} already posted — skipping` };
  }

  const channelId = config.channels[meta.channelKey];
  if (!channelId) {
    return { ok: false, error: `No channel configured for type "${type}" (config.channels.${meta.channelKey} is empty)` };
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    return { ok: false, error: `Channel ${channelId} (config.channels.${meta.channelKey}) not found or not accessible` };
  }

  const card = buildListingCard(listing, meta);

  const thread = await channel.threads.create({
    name: listing.title.slice(0, 100),
    message: { components: [card], flags: MessageFlags.IsComponentsV2 },
  });

  if (listing.id != null) markListingPosted(listing.id, thread.id);

  await log(client, `${meta.logEmoji} New ${meta.logLabel}: **${listing.title}**${listing.authorUsername ? ` by ${listing.authorUsername}` : ''}`);

  return { ok: true, threadId: thread.id };
}

module.exports = { postListing, buildListingCard, isListingPosted, markListingPosted, LISTING_TYPES };
