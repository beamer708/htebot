const { SlashCommandBuilder } = require('discord.js');
const { executeSearch } = require('../../handlers/searchHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search staff applications or suggestions.')
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('What to search')
        .setRequired(true)
        .addChoices(
          { name: 'Application', value: 'application' },
          { name: 'Suggestion',  value: 'suggestion'  },
        )
    )
    .addStringOption(opt =>
      opt.setName('id')
        .setDescription('Look up a single record by ID (e.g. APP-0001 or SUG-0001)')
        .setRequired(false)
    )
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('Filter by user')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('status')
        .setDescription('Filter by status')
        .setRequired(false)
        .addChoices(
          { name: 'Pending',  value: 'pending'  },
          { name: 'Approved', value: 'approved' },
          { name: 'Denied',   value: 'denied'   },
        )
    ),

  async execute(interaction, client) {
    return executeSearch(interaction);
  },
};
