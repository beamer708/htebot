// handlers/listingModHandler.js — Approve / Deny buttons on moderation review
// cards (customIds: listing_approve_{id}, listing_deny_{id}). Management only.
// Contract: BOT_API_CONTRACT.md
const {
  EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, MessageFlags, PermissionFlagsBits,
} = require('discord.js');
const config = require('../config.json');
const { postListing } = require('../utils/postListing');
const {
  buildReviewCard, getModerationRecord, setPublicThread, setReviewed,
  getWebsiteApi, isTestListing,
} = require('../utils/moderationListing');
const { log } = require('./logger');

const DEFAULT_DENY_REASON = 'Your listing did not meet our submission guidelines.';

const APPROVE_PREFIX    = 'listing_approve_';
const DENY_PREFIX       = 'listing_deny_';
const DENY_MODAL_PREFIX = 'listing_deny_modal_';

// ── Permission gate: management role, or Manage Guild as fallback ────────────
async function hasManagementAccess(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  return !!member && (
    member.roles.cache.has(config.managementRoleId) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild)
  );
}

async function denyAccess(interaction) {
  return interaction.reply({
    content: "You don't have permission to moderate listings.",
    flags: MessageFlags.Ephemeral,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadPendingRecord(listingId) {
  const record = getModerationRecord(listingId);
  if (!record || !record.listing) return { error: '<:circlex:1507191508657508503> Listing record not found — it may pre-date the moderation system.' };
  if (record.status !== 'pending') return { error: `<:circlex:1507191508657508503> This listing was already **${record.status}** by ${record.reviewed_by || 'someone'}.` };
  return { record };
}

/** POST to the website; returns { ok, detail }. Test listings always succeed. */
async function callWebsite(pathSuffix, body, listingId) {
  if (isTestListing(listingId)) return { ok: true, detail: 'test listing — website sync skipped' };

  const api = getWebsiteApi();
  if (!api) return { ok: false, detail: 'WEBSITE_API_URL / LISTINGS_API_SECRET not configured' };

  try {
    const res = await fetch(`${api.baseUrl}/api/bot/listings/${encodeURIComponent(listingId)}/${pathSuffix}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${api.secret}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { ok: false, detail: `website responded ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, detail: err.message };
  }
}

async function dmSubmitter(client, listing, embed) {
  if (!listing.submitterDiscordId) return { ok: false, detail: 'listing has no submitterDiscordId' };
  try {
    const user = await client.users.fetch(listing.submitterDiscordId);
    await user.send({ embeds: [embed] });
    return { ok: true };
  } catch {
    return { ok: false, detail: 'their DMs are closed' };
  }
}

/** Note a non-fatal problem inside the moderation thread. */
async function noteInThread(interaction, content) {
  await interaction.channel?.send({ content }).catch(() => {});
}

/** Replace the review card with its resolved (buttons-disabled) version. */
async function finalizeCard(interaction, listing, outcome) {
  await interaction.editReply({
    components: [buildReviewCard(listing, outcome)],
    flags: MessageFlags.IsComponentsV2,
  });
}

// ── Approve ───────────────────────────────────────────────────────────────────
async function handleListingApprove(interaction, client) {
  if (!await hasManagementAccess(interaction)) return denyAccess(interaction);

  const listingId = interaction.customId.slice(APPROVE_PREFIX.length);
  const { record, error } = loadPendingRecord(listingId);
  if (error) return interaction.reply({ content: error, flags: MessageFlags.Ephemeral });

  const listing = record.listing;
  await interaction.deferUpdate();

  // 1. Post to the public forum for its type. On a retry after a website
  //    failure the public thread already exists — reuse it, don't double-post.
  let publicThreadId = record.public_thread_id;
  if (!publicThreadId) {
    const result = await postListing(client, listing.type, listing);
    if (!result.ok) {
      return noteInThread(interaction,
        `<:alerttriangle:1507191481906106398> **Approve failed:** ${result.error}. Fix the config and click Approve again.`);
    }
    publicThreadId = result.threadId;
    setPublicThread(listingId, publicThreadId);
  }

  // 2. Tell the website. On failure, leave the buttons active for retry.
  const sync = await callWebsite('approve', { forumThreadId: publicThreadId }, listingId);
  if (!sync.ok) {
    return noteInThread(interaction,
      `<:alerttriangle:1507191481906106398> **Website approve call failed** (${sync.detail}). ` +
      `The public post is live in <#${publicThreadId}> — click Approve again to retry the website sync.`);
  }

  setReviewed(listingId, 'approved', interaction.user.tag);

  // 3. DM the submitter — closed DMs are noted, never fatal.
  const dmEmbed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('<:circlecheck:1507191508066107532> Listing Approved')
    .setDescription(`Your listing **'${listing.title}'** was approved and is now live.\n\n<:Link:1507191523094167573> ${listing.url}`)
    .setFooter({ text: 'HowToERLC Listings' })
    .setTimestamp();
  const dm = await dmSubmitter(client, listing, dmEmbed);
  if (!dm.ok) {
    await noteInThread(interaction, `<:alerttriangle:1507191481906106398> Could not DM the submitter (${dm.detail}).`);
  }

  // 4. Show the approved state and disable the buttons.
  await finalizeCard(interaction, listing, {
    status: 'approved',
    by: interaction.user.id,
    at: Math.floor(Date.now() / 1000),
    publicThreadId,
  });

  await log(client, `<:circlecheck:1507191508066107532> Listing approved: **${listing.title}** (${listing.type}) by ${interaction.user.tag} → <#${publicThreadId}>`);
}

// ── Deny (button → modal) ─────────────────────────────────────────────────────
async function handleListingDenyButton(interaction) {
  if (!await hasManagementAccess(interaction)) return denyAccess(interaction);

  const listingId = interaction.customId.slice(DENY_PREFIX.length);
  const { error } = loadPendingRecord(listingId);
  if (error) return interaction.reply({ content: error, flags: MessageFlags.Ephemeral });

  const modal = new ModalBuilder()
    .setCustomId(`${DENY_MODAL_PREFIX}${listingId}`)
    .setTitle('Deny Listing');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('listing_deny_reason')
        .setLabel('Denial reason (optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(DEFAULT_DENY_REASON)
        .setRequired(false)
        .setMaxLength(500)
    ),
  );
  return interaction.showModal(modal);
}

// ── Deny (modal submit) ───────────────────────────────────────────────────────
async function handleListingDenyModal(interaction, client) {
  if (!await hasManagementAccess(interaction)) return denyAccess(interaction);

  const listingId = interaction.customId.slice(DENY_MODAL_PREFIX.length);
  const { record, error } = loadPendingRecord(listingId);
  if (error) return interaction.reply({ content: error, flags: MessageFlags.Ephemeral });

  const listing = record.listing;
  const reason = interaction.fields.getTextInputValue('listing_deny_reason').trim() || DEFAULT_DENY_REASON;

  await interaction.deferUpdate();

  // 1. Tell the website. On failure, leave the buttons active for retry.
  const sync = await callWebsite('deny', { reason }, listingId);
  if (!sync.ok) {
    return noteInThread(interaction,
      `<:alerttriangle:1507191481906106398> **Website deny call failed** (${sync.detail}). Nothing was changed — click Deny again to retry.`);
  }

  setReviewed(listingId, 'denied', interaction.user.tag, reason);

  // 2. DM the submitter.
  const dmEmbed = new EmbedBuilder()
    .setColor('#ED4245')
    .setTitle('<:circlex:1507191508657508503> Listing Denied')
    .setDescription(`Your listing **'${listing.title}'** was denied.\n\n**Reason:** ${reason}`)
    .setFooter({ text: 'HowToERLC Listings' })
    .setTimestamp();
  const dm = await dmSubmitter(client, listing, dmEmbed);
  if (!dm.ok) {
    await noteInThread(interaction, `<:alerttriangle:1507191481906106398> Could not DM the submitter (${dm.detail}).`);
  }

  // 3. Show the denied state and disable the buttons.
  await finalizeCard(interaction, listing, {
    status: 'denied',
    by: interaction.user.id,
    at: Math.floor(Date.now() / 1000),
    reason,
  });

  await log(client, `<:circlex:1507191508657508503> Listing denied: **${listing.title}** (${listing.type}) by ${interaction.user.tag} — ${reason}`);
}

module.exports = {
  handleListingApprove, handleListingDenyButton, handleListingDenyModal,
  APPROVE_PREFIX, DENY_PREFIX, DENY_MODAL_PREFIX,
};
