# Bot ↔ Website Listing API Contract

The Discord bot polls the website for new listings and posts them into a
**moderation forum** for management review. Approving a review card posts the
listing publicly; denying it records a reason. The website is the source of
truth; the bot is a consumer. Four endpoints must exist on the website
(`WEBSITE_API_URL`, e.g. `https://howtoerlc.xyz`).

## Authentication

All endpoints require:

```
Authorization: Bearer {LISTINGS_API_SECRET}
```

The secret is a long random string shared between the website env and the bot's
`LISTINGS_API_SECRET` env var. It is intentionally separate from the older
`API_SECRET` (X-API-SECRET header) used by the bot's inbound web API.

- Missing/wrong bearer → respond `401` with any body. The bot logs a secret-mismatch
  error and retries next cycle.

## GET /api/bot/pending-listings

Returns every submitted listing that has not yet been posted for moderation,
oldest first.

**Response `200`** — JSON array (empty array when nothing is pending):

```json
[
  {
    "id": "cmb12x9a40001",
    "type": "marketplace",
    "title": "Custom ERLC Livery Pack",
    "shortDescription": "10 professionally made liveries for your department.",
    "fullDescription": "Longer body text shown on the review card.",
    "authorUsername": "b3amerr",
    "authorAvatarUrl": "https://cdn.discordapp.com/avatars/....png",
    "thumbnailUrl": "https://howtoerlc.xyz/uploads/livery-pack.png",
    "submitterDiscordId": "123456789012345678",
    "url": "https://howtoerlc.xyz/marketplace/custom-erlc-livery-pack",
    "createdAt": "2026-07-14T18:22:00.000Z"
  }
]
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Stable unique ID. Used for dedup, `mark-moderation-posted`, and approve/deny. |
| `type` | string | yes | One of `marketplace`, `resources`, `templates`, `directory`, `assets`, `guides`. Unknown types get a review card flagged "unknown type"; approval fails until fixed. |
| `title` | string | yes | Thread name (bot truncates to 100 chars) and card title. |
| `shortDescription` | string | no | Card description (review + public). |
| `fullDescription` | string | no | Extra body shown on the review card only. |
| `authorUsername` | string | no | Author line. |
| `authorAvatarUrl` | string (URL) | no | Author icon. |
| `thumbnailUrl` | string (URL) | no | Card thumbnail. |
| `submitterDiscordId` | string | no | Discord user DM'd on approve/deny. No DM if absent. |
| `url` | string (URL) | yes | Public listing URL (link button target). |
| `createdAt` | string (ISO 8601) | no | Card timestamp; defaults to now. |

**Status codes**: `200` array, `401` bad bearer, anything else is logged and
retried next cycle.

## POST /api/bot/mark-moderation-posted

Marks a listing as posted into the moderation forum so it stops appearing in
`pending-listings`. This does **not** mean approved — just "under review".

**Request body** (`Content-Type: application/json`):

```json
{ "id": "cmb12x9a40001", "moderationThreadId": "1533125097060176999" }
```

**Response**: `200` on success (body ignored). `401` bad bearer. Non-200 is
logged by the bot but not retried immediately — the bot's local
`moderation_listings` SQLite table guarantees the listing will not get a second
review card even if this call fails; the bot re-sends `mark-moderation-posted`
on the next cycle when it sees an already-tracked id in `pending-listings`.

## POST /api/bot/listings/:id/approve

Called when management clicks **Approve** on a review card, after the bot has
posted the listing to its public forum.

**Request body**:

```json
{ "forumThreadId": "1494866015501299999" }
```

`forumThreadId` is the public forum thread the listing now lives in.

**Response**: `200` on success. Non-200 → the bot reports the failure inside
the moderation thread and leaves the Approve button active; clicking Approve
again retries the sync **without** double-posting (the public thread id is
remembered locally).

## POST /api/bot/listings/:id/deny

Called when management clicks **Deny** and submits the reason modal.

**Request body**:

```json
{ "reason": "Broken download link." }
```

**Response**: `200` on success. Non-200 → the bot reports the failure inside
the moderation thread and leaves the buttons active for retry; nothing else is
processed (no DM, no status change).

## Bot behaviour summary

- Poll interval: `POLL_INTERVAL_SECONDS` (default 45s), first poll on startup.
- Pending listings become **review cards** (Components V2) in the moderation
  forum (`config.moderationForum`), sequentially with a 1.5s gap.
- Review buttons are restricted to `config.managementRoleId` (or Manage Guild).
- **Approve** → public forum post for the listing's type → `approve` call →
  DM submitter → card marked approved, buttons disabled.
- **Deny** → reason modal → `deny` call → DM submitter → card marked denied,
  buttons disabled.
- Closed DMs are noted in the moderation thread, never fatal.
- Dedup: `moderation_listings` table (review cards) + `posted_listings` table
  (public posts) checked before posting, inserted after.
- Test listings from `/showcase-test` (ids starting `test-`) skip all website
  calls, so the flow is testable without the website.
- Website unreachable → warning log, next cycle retries. No crash.
- Startup: the bot **refuses to start** if `config.moderationForum` or
  `config.managementRoleId` is missing/invalid.
