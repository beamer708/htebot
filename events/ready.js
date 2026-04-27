const { ActivityType, Collection } = require('discord.js');
const { startRetentionChecker } = require('../utils/retentionChecker');
const { resendSticky } = require('./messageCreate');
const { db } = require('../utils/appDb');
const config = require('../config.json');

async function ensureForumSetupPost(client, channelId, postTitle, postContent) {
  try {
    const existing = db.prepare('SELECT thread_id FROM setup_posts WHERE channel_id = ?').get(channelId);
    if (existing) return;

    const channel = client.channels.cache.get(channelId);
    if (!channel) return;

    const thread = await channel.threads.create({
      name: postTitle,
      message: { content: postContent },
    });

    const starter = await thread.fetchStarterMessage().catch(() => null);
    if (starter) await starter.pin().catch(() => {});

    db.prepare('INSERT INTO setup_posts (channel_id, thread_id) VALUES (?, ?)').run(channelId, thread.id);
    console.log(`[Ready] Setup post created in ${channelId}: ${thread.name}`);
  } catch (err) {
    console.error(`[Ready] Forum setup error for ${channelId}:`, err);
  }
}

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`[Ready] Logged in as ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: '🌐 howtoerlc.xyz', type: ActivityType.Watching }],
      status: 'online',
    });

    // Populate invite cache for every guild
    client.inviteCache = new Collection();
    for (const guild of client.guilds.cache.values()) {
      try {
        const invites = await guild.invites.fetch();
        client.inviteCache.set(
          guild.id,
          new Collection(invites.map(inv => [inv.code, inv.uses]))
        );
      } catch {
        // No MANAGE_GUILD permission in this guild — skip
      }
    }
    console.log('[Ready] Invite cache populated.');

    startRetentionChecker(client);

    // Forum channel setup posts (one-time, tracked in DB)
    await ensureForumSetupPost(
      client,
      config.channels.applications,
      '📋 How to Apply — Read Before Submitting',
      [
        '## How to Apply for Staff',
        '',
        'To submit an application, go to the main dashboard and click the **Apply** button. This opens a short form — fill it in honestly and completely.',
        '',
        '**What the form asks:**',
        '- Your age',
        '- Your timezone',
        '- Why you want to join the team (minimum 50 characters)',
        '- Any prior moderation, staff, or community experience',
        '- The role you are applying for',
        '',
        '**Available roles:** Community Team · Beta Tester',
        '',
        '**Response time:** We review applications as quickly as we can. You will receive a DM when a decision is made.',
        '',
        '**Please note:** Submitting multiple applications or spamming the form will result in disqualification. You may only apply once every 7 days.',
      ].join('\n')
    );

    await ensureForumSetupPost(
      client,
      config.channels.suggestions,
      '💡 How to Submit a Suggestion — Read This First',
      [
        '## How to Submit a Suggestion',
        '',
        'Use the `/suggest` command to open the suggestion form. Fill in a clear title, category, and a detailed description of your idea.',
        '',
        '**What makes a good suggestion:**',
        '- Clearly explains the problem it solves',
        '- Is specific and actionable',
        '- Has not already been suggested',
        '',
        '**Categories:** Bot · Server · Resources · Events · Other',
        '',
        '**Voting:** React with ⬆️ or ⬇️ on any suggestion post to cast your vote. Votes are considered during review.',
        '',
        '**Review process:** Staff review all suggestions and will mark them Approved or Denied. You will receive a DM with the result.',
        '',
        '**Limit:** You can submit up to 3 suggestions per 24 hours. Duplicate or low-effort suggestions will be denied.',
      ].join('\n')
    );

    // Send initial sticky messages to advertising channels
    for (const channelId of config.advertisingChannels) {
      const channel = client.channels.cache.get(channelId);
      if (channel) await resendSticky(channel).catch(() => {});
    }
    console.log('[Ready] Advertising stickies posted.');
  },
};
