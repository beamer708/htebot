# HowToERLC Bot — Complete Setup Guide

This guide walks you through everything needed to get the HowToERLC Discord bot running from scratch. No prior bot-hosting experience required.

---

## Table of Contents

1. [Discord Developer Portal — Create the Bot](#1-discord-developer-portal)
2. [Discord Developer Portal — OAuth2 for Admin Panel](#2-discord-oauth2-setup)
3. [Discord Server Setup — Channels, Categories & Roles](#3-discord-server-setup)
4. [How to Get Discord IDs](#4-how-to-get-discord-ids)
5. [Fill In config.json](#5-fill-in-configjson)
6. [.env File Setup — Every Variable Explained](#6-env-file-setup)
7. [Install & Run the Bot](#7-install--run-the-bot)
8. [Connect Your Website Forms](#8-connect-your-website-forms)
9. [Test Each Endpoint](#9-test-each-endpoint)

---

## 1. Discord Developer Portal

### Create the Application

1. Go to **https://discord.com/developers/applications**
2. Click **New Application** (top-right)
3. Name it `HowToERLC` and click **Create**
4. Under the **General Information** tab, copy your **Application ID** — this is your `DISCORD_CLIENT_ID`

### Create the Bot User

1. In the left sidebar, click **Bot**
2. Click **Add Bot**, then confirm
3. Under the bot's username, click **Reset Token**, confirm, then **copy the token** — this is your `BOT_TOKEN`
   > ⚠️ Never share this token. Store it only in your `.env` file.

### Enable Privileged Gateway Intents

Still on the **Bot** page, scroll down to **Privileged Gateway Intents** and enable:

- ✅ **Server Members Intent** — required to welcome new members and fetch member roles
- ✅ **Message Content Intent** — required for message-based features
- ✅ **Presence Intent** — required for the bot's status display

Click **Save Changes**.

### Generate the Invite Link

1. In the left sidebar, click **OAuth2 → URL Generator**
2. Under **Scopes**, check: `bot` and `applications.commands`
3. Under **Bot Permissions**, check:
   - `Manage Channels`
   - `Manage Roles`
   - `Kick Members`
   - `Ban Members`
   - `Moderate Members`
   - `Send Messages`
   - `Embed Links`
   - `Read Message History`
   - `Use External Emojis`
   - `Add Reactions`
   - `Create Public Threads`
   - `Manage Messages`
4. Copy the generated URL at the bottom
5. Open the URL in your browser → select your HowToERLC server → click **Authorize**

---

## 2. Discord OAuth2 Setup

This is for the admin analytics panel login at `/admin`.

### Add the Redirect URI

1. In the Developer Portal, go to **OAuth2 → General**
2. Under **Redirects**, click **Add Redirect** and enter:
   ```
   https://yourdomain.com/auth/discord/callback
   ```
   Replace `yourdomain.com` with wherever you're hosting the bot (e.g. `api.howtoerlc.xyz`).
   For local testing use: `http://localhost:3000/auth/discord/callback`
3. Click **Save Changes**
4. On this same page, copy:
   - **Client ID** → `DISCORD_CLIENT_ID`
   - **Client Secret** (click Reset Secret if needed) → `DISCORD_CLIENT_SECRET`

### Scopes Used

The bot's OAuth2 requests these scopes automatically:
- `identify` — reads the user's Discord ID and username
- `guilds` — checks which servers the user is in
- `guilds.members.read` — verifies the user's roles inside the HowToERLC server

---

## 3. Discord Server Setup

### Required Categories

Create these categories in your Discord server:

| Category Name | Purpose |
|---|---|
| `Support Tickets` | Contains all ticket channels created by the bot |

### Required Channels

Create these channels and note their IDs:

| Channel | Type | Purpose | Config Field |
|---|---|---|---|
| `#welcome` | Text | Welcome message for new members | `channels.welcome` |
| `#mod-logs` | Text | Moderation actions (bans, kicks, warns, mutes) + join/leave logs | `channels.logs` |
| `#create-ticket` | Text | Where `/ticket-setup` panel is posted | `channels.tickets` |
| `#ticket-transcripts` | Text | Closed ticket summaries | `channels.ticketTranscripts` |
| `#staff-applications` | Text | Incoming staff applications from the website | `channels.applications` |
| `#suggestions` | Text | Incoming suggestions from the website | `channels.suggestions` |
| `#partnerships` | Text | Incoming partnership requests from the website | `channels.partnerships` |
| `#announcements` | Text | Server announcements via `/announce` | `channels.updates` |
| `#resources` | Text | Resource releases via `/resource` | `channels.resources` |
| `#roles` | Text | Self-assign role panels via `/role-panel` | `channels.rolePanels` |

Move `#create-ticket` and any ticket channels the bot creates into the `Support Tickets` category.

### Required Roles

Create these roles and note their IDs:

| Role Name | Purpose | Config Field |
|---|---|---|
| `Staff` | All staff members — can review applications, view tickets, close tickets | `roles.staff` |
| `Admin` | Admin-level staff — can use all admin commands | `roles.admin` |
| `Moderator` | Moderation staff — can use `/ban`, `/kick`, `/mute`, `/warn` | `roles.moderator` |
| `Beta Tester` | Users allowed to access the AI assistant in beta mode | `roles.betaTester` |
| `Updates` | Pinged when `/announce` is used (optional) | `roles.notifications.updates` |
| `Resources` | Pinged when `/resource` is used (optional) | `roles.notifications.resources` |
| `Partnerships` | Pinged when a new partnership request comes in (optional) | `roles.notifications.partnerships` |

> Make sure the bot's role is positioned **above** `Staff`, `Moderator`, and any role it needs to assign or manage.

---

## 4. How to Get Discord IDs

1. In Discord, open **User Settings → Advanced**
2. Enable **Developer Mode**
3. Now you can right-click any server, channel, or user and select **Copy Server ID / Copy Channel ID / Copy User ID**

For category IDs: right-click the category name → **Copy Category ID**

---

## 5. Fill In config.json

Open `config.json` and replace every `YOUR_..._HERE` placeholder with the real ID you copied:

```json
{
  "guildId": "1234567890",          // Your Discord server ID
  "channels": {
    "welcome": "1234567890",        // #welcome channel ID
    "logs": "1234567890",           // #mod-logs channel ID
    "tickets": "1234567890",        // #create-ticket channel ID
    "ticketTranscripts": "...",     // #ticket-transcripts ID
    "applications": "...",          // #staff-applications ID
    "suggestions": "...",           // #suggestions ID
    "partnerships": "...",          // #partnerships ID
    "updates": "...",               // #announcements ID
    "resources": "...",             // #resources ID
    "rolePanels": "..."             // #roles ID
  },
  "categories": {
    "tickets": "..."                // Support Tickets category ID
  },
  "roles": {
    "staff": "...",
    "admin": "...",
    "moderator": "...",
    "betaTester": "...",
    "notifications": {
      "updates": "...",
      "resources": "...",
      "partnerships": "..."
    }
  }
}
```

The `colors` and `website` fields are already set correctly — leave them as-is.

---

## 6. .env File Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then open `.env` and fill in each value:

---

### `BOT_TOKEN`
Your Discord bot token from **Developer Portal → Bot → Token**.
```
BOT_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.Abc123.xxxxxxxxxxxxxxxxxxx
```

---

### `PORT`
The port the Express web API listens on. Default is `3000`.
```
PORT=3000
```

---

### `API_SECRET`
A secret key that your HowToERLC website must include in every form submission as the `X-API-SECRET` header. Generate a strong random value:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output:
```
API_SECRET=a3f9c2e1d4b5a8f0e7c3b2a1d9f6e4c2b0a8f7e5d4c3b2a1f0e9d8c7b6a5f4
```
You'll use this same value in your website's form submission code.

---

### `WEBSITE_URL`
The URL of your HowToERLC website. Used for CORS in production.
```
WEBSITE_URL=https://howtoerlc.xyz
```

---

### `DISCORD_CLIENT_ID`
Your application's Client ID from **Developer Portal → OAuth2 → General**.
```
DISCORD_CLIENT_ID=1234567890123456789
```

---

### `DISCORD_CLIENT_SECRET`
Your application's Client Secret from **Developer Portal → OAuth2 → General**.
```
DISCORD_CLIENT_SECRET=AbCdEfGhIjKlMnOpQrStUvWxYz123456
```

---

### `DISCORD_REDIRECT_URI`
Must exactly match the redirect URI you added in the Developer Portal.
```
DISCORD_REDIRECT_URI=https://yourdomain.com/auth/discord/callback
```
For local testing:
```
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback
```

---

### `SESSION_SECRET`
A long random string for signing login session cookies. Generate one:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
```
SESSION_SECRET=b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2
```

---

### `ANTHROPIC_API_KEY`
Your API key from **https://console.anthropic.com → API Keys**.
```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### `AI_BETA_MODE`
Set to `true` to restrict the AI chat endpoint to users with a valid beta token. Set to `false` (default) to allow anyone.
```
AI_BETA_MODE=false
```

---

### `AI_BETA_TOKENS`
Comma-separated list of valid beta tokens (only used when `AI_BETA_MODE=true`). Send one of these values in the `X-BETA-TOKEN` request header to get access.
```
AI_BETA_TOKENS=token-alpha-123,token-beta-456,token-gamma-789
```

---

### `MAINTENANCE_MODE`
Set to `true` to make all public API routes return `503 Service Unavailable`. The `/admin` panel stays accessible.
```
MAINTENANCE_MODE=false
```

---

### `NODE_ENV`
Set to `production` on your live server to enable strict CORS (only howtoerlc.xyz allowed). Use `development` locally.
```
NODE_ENV=development
```

---

## 7. Install & Run the Bot

### Step 1 — Install Dependencies

```bash
npm install
```

### Step 2 — Register Slash Commands

This must be run once (and re-run any time you add or change commands):

```bash
node deploy-commands.js
```

If `guildId` is set in `config.json`, commands register instantly to your server. If left as the placeholder, commands register globally (can take up to 1 hour to appear).

**Tip:** Keep `guildId` set during development for instant updates; you can clear it later for global deployment.

### Step 3 — Start the Bot

```bash
node index.js
```

You should see output like:
```
[CommandHandler] Loaded 11 commands.
[EventHandler] Loaded 4 events.
[Server] Web API running on port 3000
[Ready] Logged in as HowToERLC#0000
```

### Step 4 — Verify It's Working

1. In your Discord server, type `/ping` — you should get a latency response
2. Visit `http://localhost:3000/health` — you should see `{"status":"ok","bot":"online",...}`
3. In your Discord server, run `/ticket-setup` in your `#create-ticket` channel to post the ticket panel

---

## 8. Connect Your Website Forms

Your website needs to send an HTTP POST request to the bot's API whenever a form is submitted. Here's exactly how to do it for each form:

### Staff Application Form → `POST /api/application`

**URL:** `https://yourbotdomain.com/api/application`

**Required Headers:**
```
Content-Type: application/json
X-API-SECRET: (your API_SECRET value from .env)
```

**Request Body:**
```json
{
  "discordId": "123456789012345678",
  "username": "PlayerName",
  "age": 18,
  "timezone": "EST",
  "reason": "I want to help the community grow...",
  "experience": "I have moderated 3 ERLC servers...",
  "roleApplying": "Moderator"
}
```

**Success Response:**
```json
{ "success": true, "message": "Application submitted successfully.", "id": "uuid-here" }
```

---

### Suggestion Form → `POST /api/suggestion`

**URL:** `https://yourbotdomain.com/api/suggestion`

**Required Headers:**
```
Content-Type: application/json
X-API-SECRET: (your API_SECRET value from .env)
```

**Request Body:**
```json
{
  "username": "PlayerName",
  "discordId": "123456789012345678",
  "category": "Discord Server",
  "title": "Add a study resources channel",
  "details": "A dedicated channel for sharing ERLC learning materials would help new members..."
}
```

**Success Response:**
```json
{ "success": true, "message": "Suggestion submitted successfully.", "id": "uuid-here" }
```

---

### Partnership Form → `POST /api/partnership`

**URL:** `https://yourbotdomain.com/api/partnership`

**Required Headers:**
```
Content-Type: application/json
X-API-SECRET: (your API_SECRET value from .env)
```

**Request Body:**
```json
{
  "serverName": "ERLC Metro PD",
  "inviteLink": "https://discord.gg/example",
  "serverType": "ERLC Community",
  "reason": "We'd love to work together on joint patrol events...",
  "offering": "Cross-promotion, joint events, shared resources",
  "contactId": "123456789012345678"
}
```
> `contactId` is optional — if included, the contact will be DM'd the result.

**Success Response:**
```json
{ "success": true, "message": "Partnership request submitted successfully.", "id": "uuid-here" }
```

---

### AI Chat → `POST /api/ai-chat`

**URL:** `https://yourbotdomain.com/api/ai-chat`

**Request Body:**
```json
{
  "message": "How should I structure departments in my ERLC server?",
  "sessionId": "optional-session-id-for-conversation-history"
}
```
> If `AI_BETA_MODE=true`, also include header: `X-BETA-TOKEN: your-token-here`

**Success Response:**
```json
{
  "success": true,
  "reply": "For department structure, I recommend...",
  "sessionId": "uuid-session-id"
}
```

---

### Setting API_SECRET in Your Website

In your website's form submission code, add the `X-API-SECRET` header with the same value you set in `.env`:

```javascript
// Example (JavaScript fetch)
const response = await fetch('https://yourbotdomain.com/api/application', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-SECRET': 'your-api-secret-here'  // Must match .env API_SECRET
  },
  body: JSON.stringify(formData)
});
```

```python
# Example (Python requests)
import requests

response = requests.post(
    'https://yourbotdomain.com/api/application',
    json=form_data,
    headers={
        'X-API-SECRET': 'your-api-secret-here'
    }
)
```

---

## 9. Test Each Endpoint

Before going live, test each endpoint with `curl`:

### Test the application endpoint:
```bash
curl -X POST http://localhost:3000/api/application \
  -H "Content-Type: application/json" \
  -H "X-API-SECRET: your-secret-here" \
  -d '{
    "discordId": "123456789",
    "username": "TestUser",
    "age": 18,
    "timezone": "EST",
    "reason": "Test reason",
    "experience": "Test experience",
    "roleApplying": "Moderator"
  }'
```

### Test the suggestion endpoint:
```bash
curl -X POST http://localhost:3000/api/suggestion \
  -H "Content-Type: application/json" \
  -H "X-API-SECRET: your-secret-here" \
  -d '{
    "username": "TestUser",
    "discordId": "123456789",
    "category": "Discord Server",
    "title": "Test Suggestion",
    "details": "This is a test suggestion for the HowToERLC server."
  }'
```

### Test the partnership endpoint:
```bash
curl -X POST http://localhost:3000/api/partnership \
  -H "Content-Type: application/json" \
  -H "X-API-SECRET: your-secret-here" \
  -d '{
    "serverName": "Test Server",
    "inviteLink": "https://discord.gg/test",
    "serverType": "ERLC Community",
    "reason": "Test partnership reason",
    "offering": "Cross-promotion"
  }'
```

### Expected results:
- Each `curl` command returns `{"success":true,...}`
- An embed appears in the corresponding Discord channel (applications/suggestions/partnerships)
- The submission appears in the matching file in the `data/` folder
- Suggestion post creates a discussion thread automatically

---

## Quick Reference

| Task | Command |
|---|---|
| Start the bot | `node index.js` |
| Register/update slash commands | `node deploy-commands.js` |
| Install dependencies | `npm install` |
| Check API health | `GET /health` |
| Enable maintenance mode | `/maintenance enabled:true` or set `MAINTENANCE_MODE=true` in `.env` |
| Admin panel login | `GET /auth/discord` |
| Admin analytics | `GET /admin/analytics` (must be logged in) |

---

*HowToERLC Bot — Built for the HowToERLC community at [howtoerlc.xyz](https://howtoerlc.xyz)*
