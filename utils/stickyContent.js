// utils/stickyContent.js — ALL sticky message copy lives here, one entry per
// channel, so wording can be edited without touching the sticky logic
// (utils/stickyManager.js). `label` is what the /sticky control panel shows.
// Copy is verbatim; edit freely, but keep each under ~3800 characters.

const STICKY_CHANNELS = [
  {
    key: 'design',
    label: 'Design Servers',
    channelId: '1526370378593603826',
    content:
      '# 🎨 Design Servers Only\n' +
      'Only advertisements for **design servers and design services** belong here. Liveries, uniforms, graphics, ELS, and server setup communities.\n' +
      '> Wrong channel ads are deleted. Roleplay servers go to <#1526370344015757454>, bot servers to <#1526370469760991333>.\n' +
      '> Follow the advertising rules in <#1526351802562383882>.',
  },
  {
    key: 'roleplay',
    label: 'Roleplay Servers',
    channelId: '1526370344015757454',
    content:
      '# 🚓 Roleplay Servers Only\n' +
      'Only advertisements for **ERLC roleplay servers** belong here. Sessions, communities, and departments.\n' +
      '> Wrong channel ads are deleted. Design servers go to <#1526370378593603826>, bot servers to <#1526370469760991333>.\n' +
      '> Follow the advertising rules in <#1526351802562383882>.',
  },
  {
    key: 'bots',
    label: 'ERLC Bot Servers',
    channelId: '1526370469760991333',
    content:
      '# 🤖 ERLC Bot Servers Only\n' +
      'Only advertisements for **ERLC bots and bot support servers** belong here. Moderation bots, session bots, and utilities built for ERLC.\n' +
      '> Wrong channel ads are deleted. Roleplay servers go to <#1526370344015757454>, design servers to <#1526370378593603826>.\n' +
      '> Follow the advertising rules in <#1526351802562383882>.',
  },
  {
    key: 'advertising',
    label: 'Advertising Servers',
    channelId: '1526370423527182526',
    content:
      '# 📢 Advertising Servers Only\n' +
      'Only advertisements for **advertising and growth servers** belong here. Ad servers, promo networks, and growth communities.\n' +
      '> Wrong channel ads are deleted. Roleplay servers go to <#1526370344015757454>, design servers to <#1526370378593603826>.\n' +
      '> Follow the advertising rules in <#1526351802562383882>.',
  },
  {
    key: 'small',
    label: '0-250 Members',
    channelId: '1526370577940611155',
    content:
      '# 🌱 0-250 Members Only\n' +
      'Only advertisements for servers with **0 to 250 members** belong here. Give growing communities their own space.\n' +
      '> If your server has more than 250 members, post in <#1526370611755225138> instead. Misplaced ads are deleted.\n' +
      '> Follow the advertising rules in <#1526351802562383882>.',
  },
  {
    key: 'medium',
    label: '250-1,000 Members',
    channelId: '1526370611755225138',
    content:
      '# 🏙️ 250-1,000 Members Only\n' +
      'Only advertisements for servers with **250 to 1,000 members** belong here.\n' +
      '> If your server has fewer than 250 members, post in <#1526370577940611155> instead. Misplaced ads are deleted.\n' +
      '> Follow the advertising rules in <#1526351802562383882>.',
  },
  {
    key: 'spotlight',
    label: 'Spotlight',
    channelId: '1522606563859103887',
    content:
      '# ⚡ Spotlight\n' +
      'The **Spotlight** is the advertising channel reserved for **premium members**.\n' +
      '## What you get\n' +
      '> ⚡ Your ad in a low-noise, high-visibility channel\n' +
      '> 👀 Seen by the whole community, not buried in the free ad feeds\n' +
      '> 🔁 Re-post rights as your campaign evolves\n' +
      '## Who can post here?\n' +
      "Premium members only. If that's you, post away, just keep it within the server's advertising rules (see <#1526351802562383882>).\n" +
      '## Want in?\n' +
      'Ask about premium in a ticket or check <#1522606563859103887> for how campaigns work.',
  },
];

const byChannelId = new Map(STICKY_CHANNELS.map(s => [s.channelId, s]));

function getStickyEntry(channelId) {
  return byChannelId.get(String(channelId)) || null;
}

module.exports = { STICKY_CHANNELS, getStickyEntry };
