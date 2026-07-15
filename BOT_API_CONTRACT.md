# Bot ↔ Website Listing API Contract

The Discord bot polls the website for new listings. The website is the source of
truth; the bot is a consumer. Two endpoints must exist on the website
(`WEBSITE_API_URL`, e.g. `https://howtoerlc.xyz`).

## Authentication

Both endpoints require:

```
Authorization: Bearer {LISTINGS_API_SECRET}
```

The secret is a long random string shared between the website env and the bot's
`LISTINGS_API_SECRET` env var. It is intentionally separate from the older
`API_SECRET` (X-API-SECRET header) used by the bot's inbound web API.

- Missing/wrong bearer → respond `401` with any body. The bot logs a secret-mismatch
  error and retries next cycle.

## GET /api/bot/pending-listings

Returns every approved listing that has not yet been marked as posted, oldest first.

**Response `200`** — JSON array (empty array when nothing is pending):

```json
[
  {
    "id": "cmb12x9a40001",
    "type": "marketplace",
    "title": "Custom ERLC Livery Pack",
    "shortDescription": "10 professionally made liveries for your department.",
    "authorUsername": "b3amerr",
    "authorAvatarUrl": "https://cdn.discordapp.com/avatars/....png",
    "thumbnailUrl": "https://howtoerlc.xyz/uploads/livery-pack.png",
    "url": "https://howtoerlc.xyz/marketplace/custom-erlc-livery-pack",
    "createdAt": "2026-07-14T18:22:00.000Z"
  }
]
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Stable unique ID. Used for dedup and `mark-posted`. |
| `type` | string | yes | One of `marketplace`, `resources`, `templates`, `directory`, `assets`, `guides`. Unknown types are skipped and logged; they stay pending. |
| `title` | string | yes | Thread name (bot truncates to 100 chars) and embed title. |
| `shortDescription` | string | no | Embed description. |
| `authorUsername` | string | no | Embed author line. |
| `authorAvatarUrl` | string (URL) | no | Author icon. |
| `thumbnailUrl` | string (URL) | no | Embed thumbnail. |
| `url` | string (URL) | yes | Link button target ("View More" / per-type label). |
| `createdAt` | string (ISO 8601) | no | Embed timestamp; defaults to now. |

**Status codes**: `200` array, `401` bad bearer, anything else is logged and
retried next cycle.

## POST /api/bot/mark-posted

Marks a listing as posted so it stops appearing in `pending-listings`.

**Request body** (`Content-Type: application/json`):

```json
{ "id": "cmb12x9a40001" }
```

**Response**: `200` on success (body ignored). `401` bad bearer. Non-200 is
logged by the bot but not retried immediately — the bot's local
`posted_listings` SQLite table guarantees the listing will not be double-posted
even if this call fails; the bot re-sends `mark-posted` on the next cycle when it
sees an already-posted id in `pending-listings`.

## Bot behaviour summary

- Poll interval: `POLL_INTERVAL_SECONDS` (default 45s), first poll on startup.
- Listings are posted sequentially with a 1.5s gap (Discord rate-limit courtesy).
- Dedup: `posted_listings` table (`listing_id` PK) checked before posting,
  inserted after. Website `mark-posted` failures therefore cannot cause duplicates.
- Unknown `type`, missing/unconfigured channel → skipped, logged, left pending
  (fix config, it posts on a later cycle).
- Website unreachable → warning log, next cycle retries. No crash.
