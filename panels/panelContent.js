// panels/panelContent.js — ALL panel copy lives here so wording can be edited
// without touching component logic (panels/renderPanel.js, handlers/panelHandler.js).
//
// Conventions:
//   - e('name', 'unicode') resolves a bot application emoji by name at render
//     time, falling back to the known guild emoji set, then to the unicode.
//   - Section labels are short bold lines, one emoji at the start where it fits.
//   - Bold the key phrase inside a bullet, not whole sentences.
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
};

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
function dashboard() {
  return {
    heading: `## ${e('HTELogo', '🏠')} How To ERLC Dashboard`,
    intro:
      'Welcome to the **control center** of How To ERLC. This is where members ' +
      'get **support**, submit **partnerships**, and reach the **management team** directly. ' +
      'Everything below is one click away.',
    body: [
      `${e('Headset', '🎧')} **Support Tickets**\n` +
      `${e('squaredot', '▪️')} Click **Get Assistance** to open a **private ticket** with the team\n` +
      `${e('squaredot', '▪️')} Tickets are handled by staff and **claimed by one member** so nothing gets lost\n` +
      `${e('squaredot', '▪️')} Use tickets for questions, reports, and **anything that needs privacy**`,

      `${e('Link', '🔗')} **Partner Submissions**\n` +
      `${e('squaredot', '▪️')} Head to <#${PARTNER_CHANNEL_ID}> to **become a partner**\n` +
      `${e('squaredot', '▪️')} Partnered servers get **featured placements** during official campaigns`,

      `${e('shieldcheck', '🛡️')} **Reach Management Privately**\n` +
      `${e('squaredot', '▪️')} Open a ticket and ask for **management** and it will be escalated\n` +
      `${e('squaredot', '▪️')} Applications for the team are open through the **Apply** button below`,
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
    intro: 'Rules keep this community **worth being in**. Read them once, follow them always.',
    body: [
      `**\`1.\`** **Respect all members.** No harassment, hate speech, or targeted disrespect.\n` +
      `**\`2.\`** **No NSFW or inappropriate content** in any channel, name, or profile.\n` +
      `**\`3.\`** **No advertising** outside the designated advertising channels.\n` +
      `**\`4.\`** **No scamming or unauthorized selling** of any kind.\n` +
      `**\`5.\`** **English only** in public channels so everyone can take part.\n` +
      `**\`6.\`** **No alt accounts** or evading punishments.\n` +
      `**\`7.\`** **Follow Discord and Roblox ToS** at all times.\n` +
      `**\`8.\`** **Staff decisions are final.** Take disputes to a ticket, not a public channel.`,

      `${e('alerttriangle', '⚠️')} Violations lead to **warnings, mutes, or bans** depending on severity.`,
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
      `${e('squaredot', '▪️')} Run **paid ads for your server** to bring in new members\n` +
      `${e('squaredot', '▪️')} Promote a **specific marketplace listing** to boost its sales and visibility`,

      `${e('crown', '👑')} **What every campaign includes**\n` +
      `${e('squaredot', '▪️')} Every server that enters is **featured on the directory page**\n` +
      `${e('squaredot', '▪️')} Your promotion runs across **How To ERLC's channels and website**, not buried in the free ad feeds`,

      `${e('Confetti', '🎉')} **How to start**\n` +
      `${e('squaredot', '▪️')} Use the button below to **become a partner** and set up your campaign`,
    ],
    partnerButtonLabel: 'Become a Partner',
    partnerButtonUrl: channelUrl(PARTNER_CHANNEL_ID),
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
      'Listings are created on **howtoerlc.xyz** and showcased here **automatically**, ' +
      'each with a **View More** button that takes you straight to the full listing.',
    body: [
      FORUMS.map(f => `> ${e(f.emojiName, f.emojiFallback)} **${f.label}**  ${f.line}`).join('\n'),
    ],
    selectPlaceholder: 'Jump to a forum',
    websiteButtonLabel: 'Visit the Website',
    websiteUrl: WEBSITE_URL,
    forums: FORUMS,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDBOOKS — heading + intro + select sections (shown ephemerally)
// Keep every section comfortably under 3500 characters.
// ═══════════════════════════════════════════════════════════════════════════
function managementHandbook() {
  return {
    heading: `## ${e('crown', '👑')} Management Handbook`,
    intro: 'The standard for how **management** runs How To ERLC: duties, oversight, and conduct.',
    selectPlaceholder: 'Browse the handbook',
    sections: {
      responsibilities: {
        label: 'Responsibilities', emojiName: 'Target', emojiFallback: '🎯',
        description: 'What management owns day to day',
        title: `${e('Target', '🎯')} **Responsibilities**`,
        content:
          `${e('squaredot', '▪️')} **Own the direction of the server.** Management sets priorities, approves changes, and keeps every team aligned.\n` +
          `${e('squaredot', '▪️')} **Review the queues daily.** Listings awaiting moderation, partnership requests, and escalated tickets should never sit longer than 24 hours.\n` +
          `${e('squaredot', '▪️')} **Keep config and systems healthy.** Channel IDs, panels, and bot systems are management's responsibility to keep current.\n` +
          `${e('squaredot', '▪️')} **Make the final call.** When staff disagree on an action, management decides and the decision stands.\n` +
          `${e('squaredot', '▪️')} **Represent the brand.** Everything management posts publicly reflects How To ERLC.`,
      },
      staff_oversight: {
        label: 'Staff Oversight', emojiName: 'usercheck', emojiFallback: '👥',
        description: 'Hiring, trials, activity, and corrections',
        title: `${e('usercheck', '👥')} **Staff Oversight**`,
        content:
          `${e('squaredot', '▪️')} **Run the hiring pipeline.** Review applications promptly and DM every applicant a decision.\n` +
          `${e('squaredot', '▪️')} **Supervise trials.** Every new staff member starts on trial. Track their activity and moderation quality before assigning a final rank.\n` +
          `${e('squaredot', '▪️')} **Watch activity.** Staff who go inactive without notice get one check in, then a demotion conversation.\n` +
          `${e('squaredot', '▪️')} **Correct privately.** Feedback to staff happens in DMs or a private channel, never in front of members.\n` +
          `${e('squaredot', '▪️')} **Document decisions.** Promotions, demotions, and removals are logged so the next manager has context.`,
      },
      partnerships_events: {
        label: 'Partnerships and Events', emojiName: 'Confetti', emojiFallback: '🎉',
        description: 'Campaigns, partners, and giveaways',
        title: `${e('Confetti', '🎉')} **Partnerships and Events**`,
        content:
          `${e('squaredot', '▪️')} **Approve every partnership personally.** Check the server's size, activity, and content before signing off.\n` +
          `${e('squaredot', '▪️')} **Own campaign planning.** Featured days, giveaway prizes, and timelines are locked in before a campaign is announced.\n` +
          `${e('squaredot', '▪️')} **Honor what we promise.** Giveaway prizes and partner perks are paid out on time, every time.\n` +
          `${e('squaredot', '▪️')} **Keep partners informed.** Partners get advance notice of campaigns that involve them.\n` +
          `${e('squaredot', '▪️')} **Review partners quarterly.** Servers that go inactive or break standards are rotated out respectfully.`,
      },
      moderation_escalation: {
        label: 'Moderation Escalation', emojiName: 'shieldcheck', emojiFallback: '🛡️',
        description: 'When issues go above staff',
        title: `${e('shieldcheck', '🛡️')} **Moderation Escalation**`,
        content:
          `${e('squaredot', '▪️')} **Take the hard cases.** Bans, appeals, staff reports, and anything involving another staff member escalate to management.\n` +
          `${e('squaredot', '▪️')} **Hear both sides.** No permanent action on an escalated case until the member has had a chance to respond.\n` +
          `${e('squaredot', '▪️')} **Review punishments on request.** Any member can ask for a review through a ticket. Uphold, reduce, or reverse with a short written reason.\n` +
          `${e('squaredot', '▪️')} **Act on staff misconduct fast.** Abuse of permissions is a same day conversation, not a someday one.\n` +
          `${e('squaredot', '▪️')} **Keep logs intact.** Never delete moderation history. Context protects everyone.`,
      },
      conduct: {
        label: 'Conduct', emojiName: 'HTELogo', emojiFallback: '🤝',
        description: 'The bar management holds itself to',
        title: `${e('HTELogo', '🤝')} **Conduct**`,
        content:
          `${e('squaredot', '▪️')} **Hold the highest bar in the server.** Management follows every rule it enforces, visibly.\n` +
          `${e('squaredot', '▪️')} **Stay calm in public.** Frustration goes in the management channel, never in member facing chats.\n` +
          `${e('squaredot', '▪️')} **No favoritism.** Friends get the same rules, the same queue times, and the same consequences as everyone else.\n` +
          `${e('squaredot', '▪️')} **Protect private information.** Tickets, applications, and member data stay inside the team.\n` +
          `${e('squaredot', '▪️')} **Disagree in private, align in public.** Debate decisions internally, then present one voice.`,
      },
    },
  };
}

function staffHandbook() {
  return {
    heading: `## ${e('shieldcheck', '🛡️')} Staff Handbook`,
    intro: 'Everything a How To ERLC staff member needs: **expectations, tools, and how to grow** into a higher rank.',
    selectPlaceholder: 'Browse the handbook',
    sections: {
      expectations: {
        label: 'Expectations and Activity', emojiName: 'Target', emojiFallback: '🎯',
        description: 'The baseline every staff member meets',
        title: `${e('Target', '🎯')} **Expectations and Activity**`,
        content:
          `${e('squaredot', '▪️')} **Be present.** Check the server most days, respond to pings, and keep an eye on public channels.\n` +
          `${e('squaredot', '▪️')} **Consistent activity is required going into 2.0**, especially advertising. Inactive staff will not carry a rank through the relaunch.\n` +
          `${e('squaredot', '▪️')} **Communicate absences.** Going quiet for a week without notice starts a demotion conversation, telling us ahead of time never does.\n` +
          `${e('squaredot', '▪️')} **Know the rules cold.** You cannot enforce what you cannot quote.\n` +
          `${e('squaredot', '▪️')} **Represent the server.** Your conduct in other communities reflects on How To ERLC.`,
      },
      moderation_basics: {
        label: 'Moderation Basics', emojiName: 'shieldcheck', emojiFallback: '🛡️',
        description: 'How to handle violations correctly',
        title: `${e('shieldcheck', '🛡️')} **Moderation Basics**`,
        content:
          `${e('squaredot', '▪️')} **Warn first for minor issues.** A verbal warning in channel or DM solves most problems.\n` +
          `${e('squaredot', '▪️')} **Use the bot for formal action.** \`/warn\`, \`/mute\`, \`/kick\`, and \`/ban\` keep a record. Untracked punishments do not count.\n` +
          `${e('squaredot', '▪️')} **Match severity.** Spam gets a warning, slurs get a mute or ban. When unsure, pick the lighter action and ask.\n` +
          `${e('squaredot', '▪️')} **Escalate, do not guess.** Staff disputes, ban appeals, and anything involving another staff member go to management.\n` +
          `${e('squaredot', '▪️')} **Never moderate angry.** Step back, let another staff member take it.`,
      },
      tickets: {
        label: 'Tickets', emojiName: 'Headset', emojiFallback: '🎧',
        description: 'Claiming, handling, and closing support tickets',
        title: `${e('Headset', '🎧')} **Tickets**`,
        content:
          `${e('squaredot', '▪️')} **Claim before you help.** Click **Claim** so members are not answered by three people at once.\n` +
          `${e('squaredot', '▪️')} **Solve, then close.** A ticket closes when the member's issue is resolved, not when the conversation gets slow.\n` +
          `${e('squaredot', '▪️')} **Use \`/add\`** to bring another member into a ticket when they are part of the issue.\n` +
          `${e('squaredot', '▪️')} **Save a transcript** before closing anything that involved a dispute or a decision.\n` +
          `${e('squaredot', '▪️')} **Ticket contents are private.** What happens in a ticket stays with the team.`,
      },
      advertising: {
        label: 'Advertising Duties', emojiName: 'Megaphone', emojiFallback: '📣',
        description: 'Growing the server is part of the job',
        title: `${e('Megaphone', '📣')} **Advertising Duties**`,
        content:
          `${e('squaredot', '▪️')} **Advertising is a core duty**, not an extra. Every staff member posts ads on a regular schedule.\n` +
          `${e('squaredot', '▪️')} **Use the approved templates** from the PR panel so our messaging stays consistent.\n` +
          `${e('squaredot', '▪️')} **Post where it is allowed.** Only advertise in servers and channels that permit it. Never DM advertise.\n` +
          `${e('squaredot', '▪️')} **Track your output.** Advertising activity is reviewed alongside moderation activity at promotion time.\n` +
          `${e('squaredot', '▪️')} **Report what works.** If a venue performs well, tell the PR team so everyone benefits.`,
      },
      trial_promotions: {
        label: 'Trial Process and Promotions', emojiName: 'crown', emojiFallback: '👑',
        description: 'How ranks are earned here',
        title: `${e('crown', '👑')} **Trial Process and Promotions**`,
        content:
          `${e('squaredot', '▪️')} **Every new staff member starts on trial.** Your performance during the trial determines your **final rank**.\n` +
          `${e('squaredot', '▪️')} **Trials measure three things:** activity, moderation quality, and advertising output.\n` +
          `${e('squaredot', '▪️')} **Trials are not forever.** Expect a decision within a few weeks, with feedback either way.\n` +
          `${e('squaredot', '▪️')} **Promotions are earned, not asked for.** Management tracks contributions and promotes when the work shows.\n` +
          `${e('squaredot', '▪️')} **Going into 2.0, consistency wins.** The staff who show up daily now are the ones who lead after launch.`,
      },
    },
  };
}

function prHandbook() {
  return {
    heading: `## ${e('Link', '🔗')} PR Handbook`,
    intro: 'How the **PR team** grows How To ERLC: partnerships, outreach, and the standards behind both.',
    selectPlaceholder: 'Browse the handbook',
    sections: {
      what_pr_does: {
        label: 'What PR Does', emojiName: 'Target', emojiFallback: '🎯',
        description: 'The PR team mission',
        title: `${e('Target', '🎯')} **What PR Does**`,
        content:
          `${e('squaredot', '▪️')} **PR grows the server.** Members with the <@&${config.roles.prTeam}> role find communities, open conversations, and bring them in.\n` +
          `${e('squaredot', '▪️')} **Invites are tracked.** Register your permanent invite on the PR panel and the bot credits every join to you.\n` +
          `${e('squaredot', '▪️')} **Retention is the metric.** An invite counts when the member stays 30 days, not when they click.\n` +
          `${e('squaredot', '▪️')} **Payouts reward results.** Every 10 retained invites earns 50 Robux, reviewed by the <@&${config.roles.prManager}> team.\n` +
          `${e('squaredot', '▪️')} **PR feeds campaigns.** The partners you sign become the featured servers in official events.`,
      },
      partnership_standards: {
        label: 'Partnership Standards', emojiName: 'shieldcheck', emojiFallback: '🛡️',
        description: 'What a server needs to partner with us',
        title: `${e('shieldcheck', '🛡️')} **Partnership Standards**`,
        content:
          `${e('squaredot', '▪️')} **ERLC or Roblox emergency services related.** That is the community we serve.\n` +
          `${e('squaredot', '▪️')} **Active and real.** A partner server shows genuine member activity, not just a member count.\n` +
          `${e('squaredot', '▪️')} **Clean content.** No servers with NSFW, scams, or ToS violations, no exceptions.\n` +
          `${e('squaredot', '▪️')} **A working permanent invite** and a named contact we can reach.\n` +
          `${e('squaredot', '▪️')} **Final approval sits with the <@&${config.roles.prManager}> team.** PR members scout and propose, managers sign off.`,
      },
      outreach_conduct: {
        label: 'Outreach and Conduct', emojiName: 'Megaphone', emojiFallback: '📣',
        description: 'How we approach other communities',
        title: `${e('Megaphone', '📣')} **Outreach and Conduct**`,
        content:
          `${e('squaredot', '▪️')} **Use the official templates** from the PR panel Assets menu. Consistent messaging builds the brand.\n` +
          `${e('squaredot', '▪️')} **Ask before you post.** Get permission from a server's staff before advertising there.\n` +
          `${e('squaredot', '▪️')} **Never spam and never DM blast.** One clean approach beats ten ignored ones and keeps us welcome everywhere.\n` +
          `${e('squaredot', '▪️')} **Be honest about what we offer.** Oversold partnerships fall apart and cost us credibility.\n` +
          `${e('squaredot', '▪️')} **You are the first impression.** Every outreach message is How To ERLC's face in someone else's server.`,
      },
      premium_perks: {
        label: 'Premium Partner Perks', emojiName: 'crown', emojiFallback: '👑',
        description: 'What top partners receive',
        title: `${e('crown', '👑')} **Premium Partner Perks**`,
        content:
          `${e('squaredot', '▪️')} **Featured campaign days.** Premium partners headline official marketing campaigns and events.\n` +
          `${e('squaredot', '▪️')} **Priority placement** in the directory and announcement shoutouts.\n` +
          `${e('squaredot', '▪️')} **Co-hosted giveaways** backed by How To ERLC prizes.\n` +
          `${e('squaredot', '▪️')} **A direct line to the <@&${config.roles.prManager}> team** for planning and support.\n` +
          `${e('squaredot', '▪️')} **Early access** to 2.0 features and collaboration slots before public release.`,
      },
    },
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
      `${e('squaredot', '▪️')} Register a **permanent invite link** with **Register Invite**\n` +
      `${e('squaredot', '▪️')} Share it across **ERLC communities** using the outreach templates\n` +
      `${e('squaredot', '▪️')} When **10 invited members** stay **30+ days**, click **Request Payout**\n` +
      `${e('squaredot', '▪️')} A **PR Manager** reviews and processes your **50 Robux** reward`,
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
  PANEL_BANNERS, FORUMS, PARTNER_CHANNEL_ID, channelUrl,
  dashboard, serverRules, marketingCampaigns, getStarted,
  managementHandbook, staffHandbook, prHandbook, prPanel,
};
