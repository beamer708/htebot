const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('maintenance')
    .setDescription('Toggle maintenance mode for the web API.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable maintenance mode').setRequired(true)),

  async execute(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    const envPath = path.join(__dirname, '..', '..', '.env');

    let envContent = '';
    try {
      envContent = fs.readFileSync(envPath, 'utf8');
    } catch {
      envContent = '';
    }

    if (envContent.includes('MAINTENANCE_MODE=')) {
      envContent = envContent.replace(/MAINTENANCE_MODE=.*/g, `MAINTENANCE_MODE=${enabled}`);
    } else {
      envContent += `\nMAINTENANCE_MODE=${enabled}`;
    }

    fs.writeFileSync(envPath, envContent);
    process.env.MAINTENANCE_MODE = String(enabled);

    const embed = new EmbedBuilder()
      .setColor(enabled ? config.colors.warning : config.colors.success)
      .setTitle(enabled ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled')
      .setDescription(enabled
        ? 'The public web API is now returning 503 Service Unavailable. The admin panel remains accessible.'
        : 'The web API is back online and accepting requests.')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
