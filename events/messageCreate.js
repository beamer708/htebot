// events/messageCreate.js — feeds the sticky system. All debounce/rate-limit
// logic lives in utils/stickyManager.js; sticky copy in utils/stickyContent.js.
const { onMessage } = require('../utils/stickyManager');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    try {
      onMessage(message, client);
    } catch (err) {
      console.warn('[Sticky] onMessage error:', err.message);
    }
  },
};
