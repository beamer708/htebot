// utils/listingPoller.js — pulls pending listings from the website and posts
// them to their forum channels. Website is the source of truth.
// Contract: BOT_API_CONTRACT.md
const { postListing, isListingPosted } = require('./postListing');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let running = false;

async function runPollCycle(client) {
  const baseUrl = (process.env.WEBSITE_API_URL || '').replace(/\/$/, '');
  const secret  = process.env.LISTINGS_API_SECRET;

  if (!baseUrl || !secret) {
    console.warn('[ListingPoller] WEBSITE_API_URL or LISTINGS_API_SECRET not set — skipping cycle.');
    return;
  }

  // Prevent overlapping cycles if a slow cycle outlives the interval
  if (running) return;
  running = true;

  try {
    let res;
    try {
      res = await fetch(`${baseUrl}/api/bot/pending-listings`, {
        headers: { Authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      console.warn(`[ListingPoller] Website unreachable: ${err.message}`);
      return;
    }

    if (res.status === 401) {
      console.error('[ListingPoller] 401 from website — LISTINGS_API_SECRET mismatch. Check both sides.');
      return;
    }
    if (!res.ok) {
      console.warn(`[ListingPoller] pending-listings responded ${res.status}`);
      return;
    }

    let listings;
    try {
      listings = await res.json();
    } catch {
      console.warn('[ListingPoller] pending-listings returned invalid JSON');
      return;
    }
    if (!Array.isArray(listings) || listings.length === 0) return;

    console.log(`[ListingPoller] ${listings.length} pending listing(s) received.`);

    for (const listing of listings) {
      try {
        if (!listing || listing.id == null) {
          console.warn('[ListingPoller] Skipping listing with no id:', JSON.stringify(listing).slice(0, 200));
          continue;
        }

        // Dedup guard — protects even if mark-posted failed last cycle
        if (isListingPosted(listing.id)) {
          await markPosted(baseUrl, secret, listing.id);
          continue;
        }

        const result = await postListing(client, listing.type, listing);

        if (!result.ok) {
          console.warn(`[ListingPoller] Listing ${listing.id} not posted: ${result.error}`);
          continue; // don't mark-posted; unknown type / missing channel can be fixed and retried
        }

        await markPosted(baseUrl, secret, listing.id);
        console.log(`[ListingPoller] Posted listing ${listing.id} (${listing.type}) → thread ${result.threadId}`);
        await sleep(1500);
      } catch (err) {
        console.error(`[ListingPoller] Error handling listing ${listing?.id}:`, err);
      }
    }
  } catch (err) {
    console.error('[ListingPoller] Cycle error:', err);
  } finally {
    running = false;
  }
}

async function markPosted(baseUrl, secret, id) {
  try {
    const res = await fetch(`${baseUrl}/api/bot/mark-posted`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ id }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) console.warn(`[ListingPoller] mark-posted for ${id} responded ${res.status} — local dedup will prevent a double post.`);
  } catch (err) {
    console.warn(`[ListingPoller] mark-posted for ${id} failed: ${err.message} — local dedup will prevent a double post.`);
  }
}

function startListingPoller(client) {
  const intervalSec = parseInt(process.env.POLL_INTERVAL_SECONDS, 10) || 45;
  console.log(`[ListingPoller] Started — polling every ${intervalSec}s.`);
  runPollCycle(client).catch(console.error);
  setInterval(() => runPollCycle(client).catch(console.error), intervalSec * 1000);
}

module.exports = { startListingPoller, runPollCycle };
