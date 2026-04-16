const componentHandler = require('../handlers/componentHandler');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      const { cooldowns } = client;
      if (!cooldowns.has(command.data.name)) cooldowns.set(command.data.name, new Map());
      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name);
      const cooldownAmount = (command.cooldown || 3) * 1000;

      if (timestamps.has(interaction.user.id)) {
        const expiry = timestamps.get(interaction.user.id) + cooldownAmount;
        if (now < expiry) {
          const left = ((expiry - now) / 1000).toFixed(1);
          return interaction.reply({ content: `⏳ Please wait ${left}s before using \`/${command.data.name}\` again.`, ephemeral: true });
        }
      }

      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`[InteractionCreate] Error in /${command.data.name}:`, err);
        const msg = { content: 'An error occurred running that command.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg).catch(() => {});
        } else {
          await interaction.reply(msg).catch(() => {});
        }
      }
      return;
    }

    if (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) {
      await componentHandler(interaction, client);
    }
  },
};
