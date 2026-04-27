const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { db } = require('../../utils/appDb');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion for the server.'),

  async execute(interaction) {
    // Rate limit: max 3 per 24 hours
    const cutoff = Math.floor(Date.now() / 1000) - 86400;
    const { count } = db.prepare(
      'SELECT COUNT(*) as count FROM suggestions WHERE user_id = ? AND submitted_at > ?'
    ).get(interaction.user.id, cutoff);

    if (count >= 3) {
      return interaction.reply({
        content: "<:Cancel:1494830662581092482> You've reached the suggestion limit for today. Try again tomorrow.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId('suggest_modal')
      .setTitle('Submit a Suggestion');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('sug_title')
          .setLabel('Title')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Brief title for your suggestion')
          .setMaxLength(100)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('sug_category')
          .setLabel('Category')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. Bot, Server, Resources, Events')
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('sug_details')
          .setLabel('Details')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Describe your suggestion. What problem does it solve?')
          .setMinLength(30)
          .setRequired(true)
      ),
    );

    return interaction.showModal(modal);
  },
};
