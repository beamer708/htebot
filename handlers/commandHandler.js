const fs = require('fs');
const path = require('path');

module.exports = (client) => {
  const commandsPath = path.join(__dirname, '..', 'commands');

  function loadDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        loadDir(fullPath);
      } else if (entry.name.endsWith('.js')) {
        const command = require(fullPath);
        if (command.data && command.execute) {
          client.commands.set(command.data.name, command);
        } else {
          console.warn(`[CommandHandler] Skipping ${entry.name} — missing data or execute.`);
        }
      }
    }
  }

  loadDir(commandsPath);
  console.log(`[CommandHandler] Loaded ${client.commands.size} commands.`);
};
