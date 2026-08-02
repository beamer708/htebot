# HowToERLC Bot — Website Integration & Listing Showcase Audit

Read-only audit performed 2026-07-14. No code was changed. This file is intentionally untracked.

---

## 1. HTTP / API CODE

### Outbound HTTP calls
- **No `fetch`, `axios`, `undici`, `node-fetch`, or `got` usage anywhere in bot code.** The only outbound HTTP is indirect:
  - `web/routes/api.js:167` — `@anthropic-ai/sdk` calls `api.anthropic.com` for the `/api/ai-chat` endpoint (AI assistant feature).
  - discord.js's own REST layer (Discord API) — not application code.
- The website→bot direction is entirely **inbound**; the bot never calls the website.

### Inbound HTTP servers — there are TWO separate Express servers
1. **`web/server.js`** (mounted from `index.js:24` via `require('./web/server')(client)`)
   - Port: `process.env.PORT || 3000`
   - CORS locked to `howtoerlc.xyz` / `www.howtoerlc.xyz` in production
   - Sessions + Passport Discord OAuth2 (staff-gated)
   - Routes:
     - `POST /api/suggestion` (auth: `X-API-SECRET`) → creates forum thread in `config.channels.suggestions`
     - `POST /api/application` (auth: `X-API-SECRET`) → creates forum thread in `config.channels.applications`
     - `POST /api/partnership` (auth: `X-API-SECRET`) → creates forum thread in `config.channels.partnerships`
     - `POST /api/ai-chat` (auth: beta token header, no API secret) → Anthropic-backed chat
     - `GET /api/status`, `GET /auth/*` (Discord OAuth), `GET /admin/*` (analytics/applications/suggestions/partnerships, session-gated)
   - Middleware: `web/middleware/apiAuth.js` (X-API-SECRET check), `web/middleware/maintenance.js` (MAINTENANCE_MODE flag)
2. **`server.js` (repo root — "notify server", added 2026-07-14, commit d4a11bc)**
   - Port: `process.env.BOT_PORT || 3001`
   - Auth: `x-bot-secret` header vs `process.env.BOT_SECRET`
   - Started from `index.js` inside `client.once('ready')`
   - Routes:
     - `POST /directory` → `handlers/directory.js` → forum thread in `config.channels.directory`
     - `POST /resources` → `handlers/resources.js` → forum thread in `config.channels.resources`
     - `POST /tools` → `handlers/tools.js` → forum thread in `config.channels.tools`
     - `POST /templates` → `handlers/templates.js` → forum thread in `config.channels.templates`
     - `POST /marketplace` → `handlers/marketplace.js` → forum thread in `config.channels.marketplace`
     - `GET /health` (no auth)

### Website references
- `config.json`: `"website": "https://howtoerlc.xyz"`
- `web/server.js`: CORS origins, `WEBSITE_URL` env fallback
- Cosmetic references (embed text, panels, help command) in ~14 files — no functional coupling.
- The companion Next.js repo (`../howtoerlc website/`) contains `lib/bot-api.ts` (calls `BOT_API_URL` → old web server with `X-API-SECRET`) and the newer `lib/bot.ts` + `lib/bot-events.ts` (call `BOT_URL` → notify server with `x-bot-secret`).

## 2. CONFIG & SECRETS (keys only — no values printed)

### Env vars read in code
| Key | Read by |
|---|---|
| `BOT_TOKEN` | index.js, deploy-commands.js |
| `DISCORD_CLIENT_ID` | deploy-commands.js, web/server.js |
| `DISCORD_CLIENT_SECRET` | web/server.js |
| `DISCORD_REDIRECT_URI` | web/server.js |
| `PORT` | web/server.js (main web API) |
| `BOT_PORT` | server.js (notify server) |
| `BOT_SECRET` | server.js (notify server auth) |
| `API_SECRET` | web/middleware/apiAuth.js |
| `SESSION_SECRET` | web/server.js |
| `WEBSITE_URL` | web/server.js (CORS) |
| `NODE_ENV` | web/server.js |
| `MAINTENANCE_MODE` | web/middleware/maintenance.js, commands/admin/maintenance.js |
| `ANTHROPIC_API_KEY` | web/routes/api.js |
| `AI_BETA_MODE`, `AI_BETA_TOKENS` | web/routes/api.js |

### Env files
- `.env` and `.env.example` both exist. Keys match the table above **except**: ⚠️ **`BOT_SECRET` and `BOT_PORT` are NOT present in either file** — the notify server will run with an `undefined` secret (every request 401s) until these are added. See "broken/half-finished".

### Secret patterns in use
- `X-API-SECRET` header → old web API (`API_SECRET`)
- `x-bot-secret` header → new notify server (`BOT_SECRET`)
- `X-BETA-TOKEN` header → AI chat beta gating (`AI_BETA_TOKENS` comma list)

## 3. LISTING / SHOWCASE LOGIC

### Forum-posting code (threads.create)
| File | Trigger | Target channel |
|---|---|---|
| `handlers/directory.js` | POST /directory | `channels.directory` |
| `handlers/resources.js` | POST /resources | `channels.resources` |
| `handlers/tools.js` | POST /tools | `channels.tools` |
| `handlers/templates.js` | POST /templates | `channels.templates` |
| `handlers/marketplace.js` | POST /marketplace | `channels.marketplace` |
| `web/routes/api.js` | POST /api/{suggestion,application,partnership} | suggestions / applications / partnerships |
| `handlers/sugHandler.js` | /suggest modal | suggestions forum |
| `handlers/appHandler.js` | Apply button | applications forum + review channel under `categories.applications` |
| `events/ready.js` | startup one-time | pinned "how to" posts in applications + suggestions forums (dedup via `setup_posts` table) |

All five listing handlers share one pattern: validate body → fetch channel → EmbedBuilder + link button → `channel.threads.create` → `log()` to `channels.notifyLog` → `{ success: true, threadId }`.

### Schedulers / workers
- **One** interval worker: `utils/retentionChecker.js:75` — hourly `setInterval` for 30-day invite retention + payout milestones (started in ready event). No other polling loops or cron.

### Related slash commands
- `/resource` (commands/admin/resource.js) — manual resource announcement embed to `channels.resources` (text post, not forum thread)
- `/panel` — posts dashboards (Main / PR / Staff Handbook)
- `/search`, `/approve`, `/deny` — application review, not listings

### Logger
- `handlers/logger.js` — `log(client, message)` → embed to `config.channels.notifyLog` (`1507486000132264149`), try/catch, never throws.

## 4. STATE & STORAGE

- **SQLite** (`better-sqlite3`):
  - `data/db.sqlite` via `utils/appDb.js` — applications, suggestions, setup_posts (+ id counters)
  - `data/tickets.db` via `utils/db.js` — tickets (old `tickets.json.migrated` marker present)
- **JSON files** (`data/`): `invites.json`, `inviteTrackerAccess.json`, `prPayouts.json`, `prRegistered.json`, `stickyMessages.json`, `analytics.json`, `warnings.json`; legacy near-empty: `applications.json`, `partnerships.json`, `suggestions.json`
- **In-memory**: `client.inviteCache` (invite uses per guild), `client.commands`, `client.cooldowns`
- **Dedup state**: `setup_posts` table (one-time forum pinned posts). ⚠️ **The 5 listing handlers have NO dedup** — the same payload posted twice creates two threads. Fine for push-driven notify, but a polling worker would need its own "already posted" state.

## 5. STRUCTURE & HEALTH

- **Framework**: discord.js `14.26.4` (package.json range `^14.16.3`), express `4.22.1`, better-sqlite3 `12.9.0`, Node `v20.20.2` locally — **no `engines` field pinned** (relevant for Pterodactyl/Cybrancee egg config).
- **Layout**: `commands/{admin,tickets,utility}/` (16 commands), `events/` (7 files), `handlers/` (command/event routers + feature handlers + 5 listing handlers + logger), `panels/`, `utils/`, `web/` (old API), root `server.js` (notify server).
- **Startup**: `npm start` → `node index.js`. index.js builds client → loads command/event handlers → mounts `web/server` (listens immediately) → registers ready-hook for notify server → `client.login()`. Slash deploy is a separate manual `npm run deploy`.
- **Broken / half-finished:**
  1. ⚠️ `BOT_SECRET` / `BOT_PORT` missing from `.env` and `.env.example` — notify server unauthenticatable until set on the host.
  2. `config.json` → `channels.inviteLogs` is an empty string.
  3. Legacy JSON stores (`applications.json`, etc.) superseded by SQLite but still present.
  4. `panels/prPanel.js` / `mainDashboard.js` carry a MediaGallery try/catch guard for discord.js <14.18 — harmless, installed version is 14.26.4.
  5. Two overlapping auth schemes/ports for website→bot traffic (`X-API-SECRET`→PORT vs `x-bot-secret`→BOT_PORT) — works, but means two exposed ports and two secrets on the host.

---

## RECOMMENDATION (planned listing-showcase feature: polling worker + forum posting)

### REUSE
- The five listing handlers (`handlers/{directory,resources,tools,templates,marketplace}.js`) — already implement exactly the embed + link-button + forum-thread pattern with correct channels from `config.json`. Extract each one's embed/post logic into an exported `postListing(client, data)` so both the HTTP route and a polling worker call the same code.
- `handlers/logger.js` for activity logging.
- `utils/retentionChecker.js` as the template for the worker (start-in-ready + `setInterval`, hourly).
- `utils/appDb.js` (SQLite) for "already posted" dedup — follow the existing `setup_posts` table pattern (e.g. a `posted_listings (source_id, thread_id, posted_at)` table).
- `config.json` channels block — all six channels already configured.

### BUILD NEW
- The polling worker itself (`utils/listingPoller.js` or similar): outbound HTTP to the website API. **No HTTP client exists in the repo** — use Node 20's built-in `fetch` (no new dependency needed).
- Dedup/state table + mapping of website listing IDs → thread IDs.
- A website-side "list unposted/recent listings" GET endpoint (nothing in the Next.js `lib/` files suggests one exists).
- Env var for the website API base/key (e.g. `WEBSITE_API_URL` — `WEBSITE_URL` is taken for CORS; don't overload it).

### CONFLICTS
- **Push vs pull duplication**: the notify server (push) and a polling worker (pull) posting the same listing would double-post. Either drop the push endpoints, or make both paths write/check the shared dedup table before posting.
- **Env naming**: `PORT`, `BOT_PORT`, `API_SECRET`, `BOT_SECRET`, `WEBSITE_URL` are all taken — new vars must not collide, and BOT_SECRET/BOT_PORT still need to be added to the host env at all.
- **Ready-event ordering**: notify server starts in `index.js`'s `client.once('ready')` while `events/ready.js` (name `clientReady`) also runs startup work; add the worker to `events/ready.js` alongside `startRetentionChecker` rather than a second once-listener.
- Single hourly worker exists (retention checker) — no timer clash, but keep intervals staggered if the poller is also hourly.
