// panels/renderPanel.js — assembles every V2 panel from the copy in
// panelContent.js and posts or refreshes it in place. Layout contract
// (top to bottom inside ONE Container):
//   banner MediaGallery → Separator → heading+intro TextDisplay → body
//   blocks → Separator → select row (optional) → ONE button row
//   (optional) → footer MediaGallery (only if assets/banners/footer.png exists)
//
// Body blocks may be:
//   - a string                → plain TextDisplay
//   - { divider: true }       → Separator between logical sections
//   - { text, button }        → Section with the button inline beside the text
//                               (mid-embed CTA instead of bottom row)
const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  MessageFlags, resolveColor,
} = require('discord.js');
const config = require('../config.json');
const { db } = require('../utils/appDb');
const { getBanner, getFooterBanner } = require('../utils/banners');
const { emojiObject } = require('../utils/appEmojis');
const content = require('./panelContent');

db.exec(`
  CREATE TABLE IF NOT EXISTS posted_panels (
    panel_type TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    posted_at  INTEGER NOT NULL,
    PRIMARY KEY (panel_type, channel_id)
  );
`);

const ACCENT = resolveColor(config.colors.primary || '#4ade80');

// ── Small helpers ─────────────────────────────────────────────────────────────

function selectOption(opt) {
  const built = {
    label: opt.label,
    description: opt.description,
    value: opt.value,
  };
  const emoji = emojiObject(opt.emojiName, opt.emojiFallback);
  if (emoji) built.emoji = emoji;
  return built;
}

/** Resolve where the dashboard panel lives, for deep links from other panels. */
function resolveDashboardChannelId() {
  const row = db.prepare(
    "SELECT channel_id FROM posted_panels WHERE panel_type = 'dashboard' ORDER BY posted_at DESC LIMIT 1"
  ).get();
  if (row) return row.channel_id;
  if (config.channels.dashboard) return config.channels.dashboard;
  return null;
}

/**
 * Assemble one panel. Returns { components: [container], files: [] }.
 * `interactive` is { select?: StringSelectMenuBuilder, buttons?: ButtonBuilder[] }.
 */
function assemble(bannerFile, textBlocks, interactive) {
  const container = new ContainerBuilder().setAccentColor(ACCENT);
  const files = [];

  const banner = bannerFile ? getBanner(bannerFile) : null;
  if (banner) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(banner.url))
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    files.push(banner.attachment);
  }

  for (const block of textBlocks) {
    if (typeof block === 'string') {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(block));
    } else if (block?.divider) {
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    } else if (block?.text && block?.button) {
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(block.text))
          .setButtonAccessory(block.button)
      );
    } else if (block?.text) {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(block.text));
    }
  }

  if (interactive.select || interactive.buttons?.length) {
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  }
  if (interactive.select) {
    container.addActionRowComponents(new ActionRowBuilder().addComponents(interactive.select));
  }
  if (interactive.buttons?.length) {
    container.addActionRowComponents(new ActionRowBuilder().addComponents(...interactive.buttons));
  }

  const footer = getFooterBanner();
  if (footer) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(footer.url))
    );
    // Footer shares a filename across panels; only attach once
    if (!files.some(f => f.name === footer.attachment.name)) files.push(footer.attachment);
  }

  return { components: [container], files };
}

// ── Per-panel builders ────────────────────────────────────────────────────────

function buildDashboard() {
  const c = content.dashboard();

  const select = new StringSelectMenuBuilder()
    .setCustomId('dashboard:info')
    .setPlaceholder(c.selectPlaceholder)
    .setMinValues(1).setMaxValues(1)
    .addOptions(c.selectOptions.map(selectOption));

  const buttons = [
    new ButtonBuilder().setCustomId('ticket:create').setLabel('Get Assistance').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('staff_apply').setLabel('Apply').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('panelsel:roles').setLabel('Notification Roles').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setLabel('Website').setStyle(ButtonStyle.Link).setURL(config.website),
  ];

  return assemble(content.PANEL_BANNERS['dashboard'],
    [`${c.heading}\n${c.intro}`, ...c.body],
    { select, buttons });
}

function buildServerRules() {
  const c = content.serverRules();

  const buttons = [];
  const dashboardChannelId = resolveDashboardChannelId();
  if (dashboardChannelId) {
    buttons.push(
      new ButtonBuilder()
        .setLabel(c.ticketButtonLabel)
        .setStyle(ButtonStyle.Link)
        .setURL(content.channelUrl(dashboardChannelId))
    );
  } else {
    console.warn('[Panels] server-rules: no dashboard channel known (post the dashboard panel first or set config.channels.dashboard). Posting without the ticket link button.');
  }

  return assemble(content.PANEL_BANNERS['server-rules'],
    [`${c.heading}\n${c.intro}`, ...c.body],
    { buttons });
}

function buildMarketingCampaigns() {
  const c = content.marketingCampaigns();

  // The purchase CTA sits inline beside "How to start" (V2 Section) instead
  // of a bottom button row.
  const body = c.body.map(block =>
    block?.buttonKey === 'purchase'
      ? {
          text: block.text,
          button: new ButtonBuilder()
            .setLabel(c.partnerButtonLabel)
            .setStyle(ButtonStyle.Link)
            .setURL(c.partnerButtonUrl),
        }
      : block
  );

  return assemble(content.PANEL_BANNERS['marketing-campaigns'],
    [`${c.heading}\n${c.intro}`, ...body],
    {});
}

function buildGetStarted() {
  const c = content.getStarted();

  const select = new StringSelectMenuBuilder()
    .setCustomId('panelsel:jump')
    .setPlaceholder(c.selectPlaceholder)
    .setMinValues(1).setMaxValues(1)
    .addOptions(c.forums.map(f => selectOption({
      label: f.label,
      description: `Jump to the ${f.label} forum`,
      value: f.key,
      emojiName: f.emojiName,
      emojiFallback: f.emojiFallback,
    })));

  const buttons = [
    new ButtonBuilder().setLabel(c.websiteButtonLabel).setStyle(ButtonStyle.Link).setURL(c.websiteUrl),
  ];

  return assemble(content.PANEL_BANNERS['get-started'],
    [`${c.heading}\n${c.intro}`, ...c.body],
    { select, buttons });
}

function buildHandbook(type, sectionContent, customId) {
  const c = sectionContent;

  const select = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(c.selectPlaceholder)
    .setMinValues(1).setMaxValues(1)
    .addOptions(Object.entries(c.sections).map(([value, s]) => selectOption({
      label: s.label,
      description: s.description,
      value,
      emojiName: s.emojiName,
      emojiFallback: s.emojiFallback,
    })));

  return assemble(content.PANEL_BANNERS[type], [`${c.heading}\n${c.intro}`], { select });
}

function buildCommunity() {
  const c = content.community();

  // The "Want a heads-up?" section carries the Notification Roles button
  // inline (V2 Section) instead of a bottom button row.
  const body = c.body.map(block =>
    block?.buttonKey === 'notifyRoles'
      ? {
          text: block.text,
          button: new ButtonBuilder()
            .setCustomId('panelsel:roles')
            .setLabel('Notification Roles')
            .setStyle(ButtonStyle.Secondary),
        }
      : block
  );

  return assemble(content.PANEL_BANNERS['community'],
    [`${c.heading}\n${c.intro}`, ...body],
    {});
}

const BUILDERS = {
  'dashboard':           buildDashboard,
  'server-rules':        buildServerRules,
  'marketing-campaigns': buildMarketingCampaigns,
  'get-started':         buildGetStarted,
  'community':           buildCommunity,
  'management-handbook': () => buildHandbook('management-handbook', content.managementHandbook(), 'panelsel:mgmt'),
  'staff-handbook':      () => buildHandbook('staff-handbook', content.staffHandbook(), 'panelsel:staffhb'),
  'pr-handbook':         () => buildHandbook('pr-handbook', content.prHandbook(), 'panelsel:prhb'),
  'pr':                  () => require('./prPanel').buildPrPanel(),
};

/**
 * Post a panel to `channel`, or edit the previously posted one in place.
 * Returns { updated, messageId }.
 */
async function postOrUpdatePanel(channel, type) {
  const builder = BUILDERS[type];
  if (!builder) throw new Error(`Unknown panel type "${type}"`);

  const { components, files } = builder();
  const payload = { components, files, flags: MessageFlags.IsComponentsV2 };

  const existing = db.prepare(
    'SELECT message_id FROM posted_panels WHERE panel_type = ? AND channel_id = ?'
  ).get(type, channel.id);

  if (existing) {
    const message = await channel.messages.fetch(existing.message_id).catch(() => null);
    if (message) {
      // attachments: [] drops the previous upload so edits replace the banner
      // instead of accumulating orphaned files on the message
      await message.edit({ ...payload, attachments: [] });
      return { updated: true, messageId: message.id };
    }
    // Tracked message was deleted; fall through to a fresh post
  }

  const message = await channel.send(payload);
  db.prepare(`
    INSERT INTO posted_panels (panel_type, channel_id, message_id, posted_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(panel_type, channel_id) DO UPDATE SET message_id = excluded.message_id, posted_at = excluded.posted_at
  `).run(type, channel.id, message.id, Math.floor(Date.now() / 1000));

  // The server-rules ticket link resolves the dashboard's location. When the
  // dashboard (re)posts, refresh any tracked rules panels so a missing link
  // appears without a manual re-run.
  if (type === 'dashboard') {
    const rulesRows = db.prepare("SELECT channel_id FROM posted_panels WHERE panel_type = 'server-rules'").all();
    for (const row of rulesRows) {
      try {
        const rulesChannel = await channel.client.channels.fetch(row.channel_id).catch(() => null);
        if (rulesChannel) await postOrUpdatePanel(rulesChannel, 'server-rules');
      } catch (err) {
        console.warn(`[Panels] Could not refresh server-rules panel in ${row.channel_id}: ${err.message}`);
      }
    }
  }

  return { updated: false, messageId: message.id };
}

module.exports = { postOrUpdatePanel, BUILDERS, resolveDashboardChannelId, assemble, selectOption };
