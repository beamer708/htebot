// panels/panelContent.js — ALL panel copy lives here so wording can be edited
// without touching component logic (panels/renderPanel.js, handlers/panelHandler.js).
//
// Formatting standard (applies to EVERY embed/panel the bot sends):
//   - Headings ("#", "##") for titles and section titles.
//   - "-# " subtext for descriptions and secondary/explanatory text.
//   - Native "- " lists for any enumeration. Never emoji bullets.
//   - Emojis: at most one tasteful emoji in a main title. No per-line emoji.
//   - Separators between logical sections ({ divider: true } body blocks).
//   - Mid-embed CTAs use { text, button } body blocks (V2 Sections) so a
//     button can sit inline between content instead of at the bottom.
//   - At most one Primary (blurple) button per message; the rest Secondary
//     or Link. Link buttons cannot be blurple.
//   - e('name', 'unicode') resolves a bot application emoji by name at render
//     time, falling back to the known guild emoji set, then to the unicode.
//   - No em dashes anywhere.
const config = require('../config.json');
const { e } = require('../utils/appEmojis');

const WEBSITE_URL = config.website || 'https://howtoerlc.xyz';
const PARTNER_CHANNEL_ID = '1533185338481184768';

// Channel link helper (guild-scoped deep link)
const channelUrl = (channelId) => `https://discord.com/channels/${config.guildId}/${channelId}`;

// ── Panel registry: banner file + accent per type ────────────────────────────
const PANEL_BANNERS = {
  'dashboard':           'Dashboard.png',
  'server-rules':        'ServerRules.png',
  'marketing-campaigns': 'Campaigns.png',
  'get-started':         'GetStarted.png',
  'management-handbook': 'Dashboard.png',
  'staff-handbook':      'Dashboard.png',
  'pr-handbook':         'Dashboard.png',
  'pr':                  'Dashboard.png',
  'community':           'Dashboard.png',
  'trial-staff':         'Dashboard.png',
  'staff-promotions':    'Dashboard.png',
};

// Channel members grab notification roles from (referenced by the community panel)
const NOTIFY_ROLES_CHANNEL_ID = '1485008262821843225';

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
function dashboard() {
  return {
    heading: `## ${e('HTELogo', '👋')} Welcome to How To ERLC`,
    intro:
      '-# Glad you\'re here. This dashboard is your one stop for getting help, ' +
      'joining the team, and staying in the loop.',
    body: [
      { divider: true },
      `**From here you can:**\n` +
      `- **Get Assistance**, open a private support ticket\n` +
      `- **Apply** to join the staff team\n` +
      `- Pick your **Notification Roles**\n` +
      `- Become a partner in <#${PARTNER_CHANNEL_ID}>`,
    ],
    selectPlaceholder: 'Server Information',
    selectOptions: [
      { label: 'About How To ERLC',      description: 'What this server is and who it is for',  value: 'info_about',       emojiName: 'infocircle',  emojiFallback: 'ℹ️' },
      { label: 'Server Guidelines',      description: 'Rules and conduct expectations',          value: 'info_guidelines',  emojiName: 'shieldcheck', emojiFallback: '🛡️' },
      { label: 'Advertising Guidelines', description: 'Rules for advertising here',              value: 'info_advertising', emojiName: 'Megaphone',   emojiFallback: '📣' },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVER RULES
// ═══════════════════════════════════════════════════════════════════════════
function serverRules() {
  return {
    heading: `## ${e('shieldcheck', '🛡️')} Server Rules`,
    intro: '-# These rules apply in every channel, thread, ticket, and DM sent through this server. Read them once, follow them always.',
    body: [
      { divider: true },

      `**1. General Conduct**\n` +
      `-# Treat everyone with respect. No harassment, bullying, hate speech, or discrimination of any kind. Do not start or fuel drama, arguments belong in DMs or a ticket, not public channels.`,

      `**2. Advertising**\n` +
      `-# Advertising is allowed only in the designated advertising channels.\n` +
      `- No advertising in DMs, ever\n` +
      `- No promoting other communities outside the designated channels\n` +
      `- Repeat offenders lose advertising access and may be removed from the server`,

      `**3. Content Standards**\n` +
      `-# Keep everything appropriate for the whole community.\n` +
      `- No NSFW or shock content in any channel, name, or profile\n` +
      `- No spam, flooding, or mass pinging\n` +
      `- No self-bots or automation on member accounts\n` +
      `- Usernames and avatars must be appropriate`,

      `**4. Marketplace and Listings**\n` +
      `-# The marketplace runs on trust.\n` +
      `- No scams or bait listings, deliver exactly what you sell\n` +
      `- No stolen assets and no reselling of stolen work\n` +
      `- Be honest in every listing: real previews, real prices, real ownership`,

      `**5. Respect Staff**\n` +
      `-# Follow staff direction the first time. If you disagree with a decision, take it to a ticket, staff decisions stand until reviewed by management.`,

      `**6. No Exploiting, Leaking, or Doxxing**\n` +
      `-# No exploiting bugs or systems, no leaking private content or personal information, no doxxing, and no malicious or disguised links. These are instant-ban offenses.`,

      { divider: true },

      `**Platform Rules Are Mandatory**\n` +
      `-# Everyone here must follow the **PRC (Police Roleplay Community / ER:LC) rules**, **Discord's Terms of Service and Community Guidelines**, and **Roblox's Terms of Service**. This is non-negotiable: a violation of PRC, Discord, or Roblox rules is a violation of ours and is punished here too.`,

      { divider: true },

      `**Consequences**\n` +
      `-# Violations earn warnings, mutes, or bans depending on severity and history. **A ban from this server is an ecosystem ban**: you lose the website, your listings, and every How To ERLC feature with it.`,
    ],
    ticketButtonLabel: 'Open a Ticket',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKETING CAMPAIGNS
// ═══════════════════════════════════════════════════════════════════════════
function marketingCampaigns() {
  return {
    heading: `## ${e('Megaphone', '📣')} Marketing Campaigns`,
    intro:
      'Marketing Campaigns are **paid promotions run through How To ERLC** that put your community in front of the whole player base. ' +
      'Grow your server or push a specific listing, we handle the reach.',
    body: [
      `${e('Target', '🎯')} **What you can promote**\n` +
      `- Run **paid ads for your server** to bring in new members\n` +
      `- Promote a **specific marketplace listing** to boost its sales and visibility`,

      `${e('crown', '👑')} **What every campaign includes**\n` +
      `- Every server that enters is **featured on the directory page**\n` +
      `- Your promotion runs across **How To ERLC's channels and website**, not buried in the free ad feeds`,

      {
        text:
          `${e('Confetti', '🎉')} **How to start**\n` +
          `-# Purchase a paid ad and set up your campaign in a couple of clicks.`,
        buttonKey: 'purchase',
      },
    ],
    partnerButtonLabel: 'Get Started With Paid Ads',
    partnerButtonUrl: `${WEBSITE_URL}/directory`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GET STARTED
// ═══════════════════════════════════════════════════════════════════════════
const FORUMS = [
  { key: 'marketplace', label: 'Marketplace', emojiName: 'Coin',          emojiFallback: '🛒',
    line: 'Buy and sell **liveries, uniforms, and services** from trusted creators.' },
  { key: 'resources',   label: 'Resources',   emojiName: 'Book',          emojiFallback: '📚',
    line: 'Free **guides, packs, and materials** for building your community.' },
  { key: 'templates',   label: 'Templates',   emojiName: 'FileText',      emojiFallback: '📄',
    line: 'Ready to use **server, document, and application templates**.' },
  { key: 'directory',   label: 'Directory',   emojiName: 'clipboardlist', emojiFallback: '📋',
    line: 'Browse **ERLC communities** looking for members like you.' },
  { key: 'assets',      label: 'Assets',      emojiName: 'pencil',        emojiFallback: '🎨',
    line: 'Downloadable **graphics, logos, and design assets** for your server.' },
  { key: 'guides',      label: 'Guides',      emojiName: 'Target',        emojiFallback: '📖',
    line: 'Step by step **walkthroughs** for setups, systems, and staff structures.' },
];

function getStarted() {
  return {
    heading: `## ${e('Target', '🚀')} Get Started`,
    intro:
      '-# Listings are created on **howtoerlc.xyz** and showcased here automatically, ' +
      'each with a **View More** button that takes you straight to the full listing.',
    body: [
      FORUMS.map(f => `- **${f.label}**  ${f.line}`).join('\n'),
    ],
    selectPlaceholder: 'Jump to a forum',
    websiteButtonLabel: 'Visit the Website',
    websiteUrl: WEBSITE_URL,
    forums: FORUMS,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMUNITY
// ═══════════════════════════════════════════════════════════════════════════
function community() {
  return {
    heading: `## 🎉 Community`,
    intro:
      '-# This is where everything fun happens: giveaways, events, and everything ' +
      'we run with and for the community.',
    body: [
      { divider: true },

      `**What you'll find here**\n` +
      `- 🎁 **How To ERLC Giveaways**, hosted by us, free to enter\n` +
      `- 🤝 **Partnered Giveaways**, collabs with our verified partners\n` +
      `- 📅 **Server Events**, community nights, launch events, and more`,

      { divider: true },

      `**How to take part**\n` +
      `-# Most giveaways and events are announced right here with entry instructions attached, usually a button or reaction. No purchases, no catches. Just be a member.`,

      {
        text:
          `**Want a heads-up?**\n` +
          `-# Grab the notification roles in <#${NOTIFY_ROLES_CHANNEL_ID}> so you never miss a drop.`,
        buttonKey: 'notifyRoles',
      },

      `**Hosting something with us?**\n` +
      `-# Partners and creators can run giveaways or events through the server. Open a ticket to pitch it.`,

      { divider: true },

      `**Free stuff, community events, and good vibes. That's the channel.**`,
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDBOOKS — heading + intro + select sections (shown ephemerally)
// Keep every section comfortably under 3500 characters.
// ═══════════════════════════════════════════════════════════════════════════
function managementHandbook() {
  return {
    heading: `## ${e('crown', '👑')} Management Handbook`,
    intro: '-# The standard for how management runs How To ERLC: duties, oversight, and conduct.',
    selectPlaceholder: 'Browse the handbook',
    sections: {
      responsibilities: {
        label: 'Responsibilities', emojiName: 'Target', emojiFallback: '🎯',
        description: 'What management owns day to day',
        title: `### Responsibilities`,
        content:
          `- **Own the direction of the server.** Management sets priorities, approves changes, and keeps every team aligned.\n` +
          `- **Review the queues daily.** Listings awaiting moderation, partnership requests, and escalated tickets should never sit longer than 24 hours.\n` +
          `- **Keep config and systems healthy.** Channel IDs, panels, and bot systems are management's responsibility to keep current.\n` +
          `- **Make the final call.** When staff disagree on an action, management decides and the decision stands.\n` +
          `- **Represent the brand.** Everything management posts publicly reflects How To ERLC.`,
      },
      staff_oversight: {
        label: 'Staff Oversight', emojiName: 'usercheck', emojiFallback: '👥',
        description: 'Hiring, trials, activity, and corrections',
        title: `### Staff Oversight`,
        content:
          `- **Run the hiring pipeline.** Review applications promptly and DM every applicant a decision.\n` +
          `- **Supervise trials.** Every new staff member starts on trial. Track their activity and moderation quality before assigning a final rank.\n` +
          `- **Watch activity.** Staff who go inactive without notice get one check in, then a demotion conversation.\n` +
          `- **Correct privately.** Feedback to staff happens in DMs or a private channel, never in front of members.\n` +
          `- **Document decisions.** Promotions, demotions, and removals are logged so the next manager has context.`,
      },
      partnerships_events: {
        label: 'Partnerships and Events', emojiName: 'Confetti', emojiFallback: '🎉',
        description: 'Campaigns, partners, and giveaways',
        title: `### Partnerships and Events`,
        content:
          `- **Approve every partnership personally.** Check the server's size, activity, and content before signing off.\n` +
          `- **Own campaign planning.** Featured days, giveaway prizes, and timelines are locked in before a campaign is announced.\n` +
          `- **Honor what we promise.** Giveaway prizes and partner perks are paid out on time, every time.\n` +
          `- **Keep partners informed.** Partners get advance notice of campaigns that involve them.\n` +
          `- **Review partners quarterly.** Servers that go inactive or break standards are rotated out respectfully.`,
      },
      moderation_escalation: {
        label: 'Moderation Escalation', emojiName: 'shieldcheck', emojiFallback: '🛡️',
        description: 'When issues go above staff',
        title: `### Moderation Escalation`,
        content:
          `- **Take the hard cases.** Bans, appeals, staff reports, and anything involving another staff member escalate to management.\n` +
          `- **Hear both sides.** No permanent action on an escalated case until the member has had a chance to respond.\n` +
          `- **Review punishments on request.** Any member can ask for a review through a ticket. Uphold, reduce, or reverse with a short written reason.\n` +
          `- **Act on staff misconduct fast.** Abuse of permissions is a same day conversation, not a someday one.\n` +
          `- **Keep logs intact.** Never delete moderation history. Context protects everyone.`,
      },
      conduct: {
        label: 'Conduct', emojiName: 'HTELogo', emojiFallback: '🤝',
        description: 'The bar management holds itself to',
        title: `### Conduct`,
        content:
          `- **Hold the highest bar in the server.** Management follows every rule it enforces, visibly.\n` +
          `- **Stay calm in public.** Frustration goes in the management channel, never in member facing chats.\n` +
          `- **No favoritism.** Friends get the same rules, the same queue times, and the same consequences as everyone else.\n` +
          `- **Protect private information.** Tickets, applications, and member data stay inside the team.\n` +
          `- **Disagree in private, align in public.** Debate decisions internally, then present one voice.`,
      },
    },
  };
}

function staffHandbook() {
  return {
    heading: `## ${e('shieldcheck', '🛡️')} Staff Handbook`,
    intro: '-# Everything a How To ERLC staff member needs: expectations, tools, and how to grow into a higher rank.',
    selectPlaceholder: 'Browse the handbook',
    sections: {
      expectations: {
        label: 'Expectations and Activity', emojiName: 'Target', emojiFallback: '🎯',
        description: 'The baseline every staff member meets',
        title: `### Expectations and Activity`,
        content:
          `- **Be present.** Check the server most days, respond to pings, and keep an eye on public channels.\n` +
          `- **Consistent activity is required going into 2.0**, especially advertising. Inactive staff will not carry a rank through the relaunch.\n` +
          `- **Communicate absences.** Going quiet for a week without notice starts a demotion conversation, telling us ahead of time never does.\n` +
          `- **Know the rules cold.** You cannot enforce what you cannot quote.\n` +
          `- **Represent the server.** Your conduct in other communities reflects on How To ERLC.`,
      },
      moderation_basics: {
        label: 'Moderation Basics', emojiName: 'shieldcheck', emojiFallback: '🛡️',
        description: 'How to handle violations correctly',
        title: `### Moderation Basics`,
        content:
          `- **Warn first for minor issues.** A verbal warning in channel or DM solves most problems.\n` +
          `- **Use the bot for formal action.** \`/warn\`, \`/mute\`, \`/kick\`, and \`/ban\` keep a record. Untracked punishments do not count.\n` +
          `- **Match severity.** Spam gets a warning, slurs get a mute or ban. When unsure, pick the lighter action and ask.\n` +
          `- **Escalate, do not guess.** Staff disputes, ban appeals, and anything involving another staff member go to management.\n` +
          `- **Never moderate angry.** Step back, let another staff member take it.`,
      },
      tickets: {
        label: 'Tickets', emojiName: 'Headset', emojiFallback: '🎧',
        description: 'Claiming, handling, and closing support tickets',
        title: `### Tickets`,
        content:
          `- **Claim before you help.** Click **Claim** so members are not answered by three people at once.\n` +
          `- **Solve, then close.** A ticket closes when the member's issue is resolved, not when the conversation gets slow.\n` +
          `- **Use \`/add\`** to bring another member into a ticket when they are part of the issue.\n` +
          `- **Save a transcript** before closing anything that involved a dispute or a decision.\n` +
          `- **Ticket contents are private.** What happens in a ticket stays with the team.`,
      },
      advertising: {
        label: 'Advertising Duties', emojiName: 'Megaphone', emojiFallback: '📣',
        description: 'Growing the server is part of the job',
        title: `### Advertising Duties`,
        content:
          `- **Advertising is a core duty**, not an extra. Every staff member posts ads on a regular schedule.\n` +
          `- **Use the approved templates** from the PR panel so our messaging stays consistent.\n` +
          `- **Post where it is allowed.** Only advertise in servers and channels that permit it. Never DM advertise.\n` +
          `- **Track your output.** Advertising activity is reviewed alongside moderation activity at promotion time.\n` +
          `- **Report what works.** If a venue performs well, tell the PR team so everyone benefits.`,
      },
      trial_promotions: {
        label: 'Trial Process and Promotions', emojiName: 'crown', emojiFallback: '👑',
        description: 'How ranks are earned here',
        title: `### Trial Process and Promotions`,
        content:
          `- **Every new staff member starts on trial.** Your performance during the trial determines your **final rank**.\n` +
          `- **Trials measure three things:** activity, moderation quality, and advertising output.\n` +
          `- **Trials are not forever.** Expect a decision within a few weeks, with feedback either way.\n` +
          `- **Promotions are earned, not asked for.** Management tracks contributions and promotes when the work shows.\n` +
          `- **Going into 2.0, consistency wins.** The staff who show up daily now are the ones who lead after launch.`,
      },
    },
  };
}

function prHandbook() {
  return {
    heading: `## ${e('Link', '🔗')} PR Handbook`,
    intro: '-# How the PR team grows How To ERLC: partnerships, outreach, and the standards behind both.',
    selectPlaceholder: 'Browse the handbook',
    sections: {
      what_pr_does: {
        label: 'What PR Does', emojiName: 'Target', emojiFallback: '🎯',
        description: 'The PR team mission',
        title: `### What PR Does`,
        content:
          `- **PR grows the server.** Members with the <@&${config.roles.prTeam}> role find communities, open conversations, and bring them in.\n` +
          `- **Invites are tracked.** Register your permanent invite on the PR panel and the bot credits every join to you.\n` +
          `- **Retention is the metric.** An invite counts when the member stays 30 days, not when they click.\n` +
          `- **Payouts reward results.** Every 10 retained invites earns 50 Robux, reviewed by the <@&${config.roles.prManager}> team.\n` +
          `- **PR feeds campaigns.** The partners you sign become the featured servers in official events.`,
      },
      partnership_standards: {
        label: 'Partnership Standards', emojiName: 'shieldcheck', emojiFallback: '🛡️',
        description: 'What a server needs to partner with us',
        title: `### Partnership Standards`,
        content:
          `- **ERLC or Roblox emergency services related.** That is the community we serve.\n` +
          `- **Active and real.** A partner server shows genuine member activity, not just a member count.\n` +
          `- **Clean content.** No servers with NSFW, scams, or ToS violations, no exceptions.\n` +
          `- **A working permanent invite** and a named contact we can reach.\n` +
          `- **Final approval sits with the <@&${config.roles.prManager}> team.** PR members scout and propose, managers sign off.`,
      },
      outreach_conduct: {
        label: 'Outreach and Conduct', emojiName: 'Megaphone', emojiFallback: '📣',
        description: 'How we approach other communities',
        title: `### Outreach and Conduct`,
        content:
          `- **Use the official templates** from the PR panel Assets menu. Consistent messaging builds the brand.\n` +
          `- **Ask before you post.** Get permission from a server's staff before advertising there.\n` +
          `- **Never spam and never DM blast.** One clean approach beats ten ignored ones and keeps us welcome everywhere.\n` +
          `- **Be honest about what we offer.** Oversold partnerships fall apart and cost us credibility.\n` +
          `- **You are the first impression.** Every outreach message is How To ERLC's face in someone else's server.`,
      },
      premium_perks: {
        label: 'Premium Partner Perks', emojiName: 'crown', emojiFallback: '👑',
        description: 'What top partners receive',
        title: `### Premium Partner Perks`,
        content:
          `- **Featured campaign days.** Premium partners headline official marketing campaigns and events.\n` +
          `- **Priority placement** in the directory and announcement shoutouts.\n` +
          `- **Co-hosted giveaways** backed by How To ERLC prizes.\n` +
          `- **A direct line to the <@&${config.roles.prManager}> team** for planning and support.\n` +
          `- **Early access** to 2.0 features and collaboration slots before public release.`,
      },
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIAL STAFF — the process a trial staff member follows to earn a full rank
// ═══════════════════════════════════════════════════════════════════════════
function trialStaff() {
  return {
    heading: `## ${e('Target', '🎯')} Trial Staff, Passing Your Trial`,
    intro:
      '-# Every new staff member starts on trial. Here is exactly what the trial ' +
      'covers, what we look at, and how you move up.',
    body: [
      { divider: true },

      `**1. Know the expectations**\n` +
      `-# Be active most days, stay professional in every channel, and follow the staff handbook. Your trial starts the day you are accepted and runs for at least [TRIAL_LENGTH].`,

      `**2. Do the work you're evaluated on**\n` +
      `- **Moderation**: handle violations correctly and log actions through the bot\n` +
      `- **Tickets**: claim, resolve, and close at least [MIN_TICKETS] tickets\n` +
      `- **Advertising or invites**: depending on your track, post ads on schedule or bring in invites through the PR program`,

      `**3. Hit the minimums**\n` +
      `-# You need [MIN_ACTIVITY] activity across the trial and no unexplained absences. Going quiet for a week without notice can end the trial early.`,

      `**4. Get evaluated**\n` +
      `-# At the end of your trial, management reviews your activity, moderation quality, and conduct, with input from the senior staff you worked with.`,

      `**5. Get promoted**\n` +
      `-# Pass the evaluation and management signs off on your promotion to your full rank. Either way you get a decision and feedback, trials never just drag on.`,

      { divider: true },

      `-# Questions about your trial? Open a ticket or message a member of management directly.`,
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// STAFF PROMOTIONS — what earns a promotion
// ═══════════════════════════════════════════════════════════════════════════
function staffPromotions() {
  return {
    heading: `## ${e('crown', '👑')} Staff Promotions`,
    intro:
      '-# Promotions here are earned, not asked for. This is what management ' +
      'looks at when deciding who moves up.',
    body: [
      { divider: true },

      `**Consistent activity**\n` +
      `-# Show up most days and be visible in public channels. Consistency over weeks beats bursts of activity.`,

      `**Handle tickets well**\n` +
      `-# Claim tickets, resolve the actual issue, and close them cleanly. Members leaving tickets happy is one of the strongest signals we track.`,

      `**Hit your advertising and invite goals**\n` +
      `-# Post ads on schedule and grow your tracked invites through the PR program. Growth work counts as much as moderation.`,

      `**Professionalism and conduct**\n` +
      `-# Stay calm in public, enforce rules fairly, and represent How To ERLC well everywhere, including other servers.`,

      `**Help members and take initiative**\n` +
      `-# Answer questions without being asked, spot problems before they grow, and propose improvements instead of waiting for direction.`,

      `**A clean record and good feedback**\n` +
      `-# No active warnings, and positive feedback from management and the staff you work with.`,

      { divider: true },

      `**Do these consistently and the promotion follows. Management tracks contributions, the work speaks for itself.**`,
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PR TEAM PANEL (public) — invite program hub
// ═══════════════════════════════════════════════════════════════════════════
function prPanel() {
  return {
    heading: `## ${e('HTELogo', '🤝')} PR Team, Invite Program`,
    intro:
      'Earn **50 Robux** for every **10 members** you invite who stay **30+ days**. ' +
      'Grab outreach templates, browse the handbook, and manage your invites right here.',
    body: [
      `${e('Target', '🎯')} **How it works**\n` +
      `- Register a **permanent invite link** with **Register Invite**\n` +
      `- Share it across **ERLC communities** using the outreach templates\n` +
      `- When **10 invited members** stay **30+ days**, click **Request Payout**\n` +
      `- A **PR Manager** reviews and processes your **50 Robux** reward`,
    ],
    selectPlaceholder: 'Outreach assets and handbook',
    // Merged menu: asset values dispatch to the assets handler, the rest to the
    // handbook handler (see handlePrMenu in componentHandler).
    selectOptions: [
      { label: 'Server Advertisement',  description: 'General ad for advertisement channels',            value: 'advertisement', emojiName: 'Megaphone', emojiFallback: '📣' },
      { label: 'Invitation Offer',      description: 'Personal outreach message for specific servers',   value: 'invitation',    emojiName: 'Select',    emojiFallback: '✉️' },
      { label: 'What is the PR Team?',  description: 'Your role and responsibilities',                   value: 'role',          emojiName: 'Target',    emojiFallback: '🎯' },
      { label: 'Invite Link Setup',     description: 'Create and register your permanent invite',        value: 'invite_setup',  emojiName: 'Link',      emojiFallback: '🔗' },
      { label: 'Payout System',         description: 'How the 50 Robux payout works',                    value: 'payouts',       emojiName: 'Coin',      emojiFallback: '🪙' },
      { label: 'Tracking and Stats',    description: 'How invites are tracked and counted',              value: 'tracking',      emojiName: 'chartbar',  emojiFallback: '📊' },
    ],
  };
}

module.exports = {
  PANEL_BANNERS, FORUMS, PARTNER_CHANNEL_ID, NOTIFY_ROLES_CHANNEL_ID, channelUrl,
  dashboard, serverRules, marketingCampaigns, getStarted, community,
  trialStaff, staffPromotions,
  managementHandbook, staffHandbook, prHandbook, prPanel,
};
