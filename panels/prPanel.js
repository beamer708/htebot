// panels/prPanel.js — public PR Team panel, built to the same V2 layout
// contract as every other panel (see panels/renderPanel.js). Copy lives in
// panels/panelContent.js. The old two-menu layout was merged into one select
// (customId pr:menu); the legacy pr:assets / pr:handbook customIds on already
// posted panels keep working through their original handlers.
const { ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const content = require('./panelContent');

/**
 * Build the PR panel as { components, files }. Assembly is delegated to
 * renderPanel's shared layout so banner/footer/accent behavior stays uniform.
 */
function buildPrPanel() {
  // Late require avoids a load-order cycle (renderPanel requires this module)
  const { assemble, selectOption } = require('./renderPanel');
  const c = content.prPanel();

  const select = new StringSelectMenuBuilder()
    .setCustomId('pr:menu')
    .setPlaceholder(c.selectPlaceholder)
    .setMinValues(1).setMaxValues(1)
    .addOptions(c.selectOptions.map(selectOption));

  const buttons = [
    new ButtonBuilder().setCustomId('pr:mystats').setLabel('My Stats').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('pr:register').setLabel('Register Invite').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('pr:payout').setLabel('Request Payout').setStyle(ButtonStyle.Secondary),
  ];

  return assemble(content.PANEL_BANNERS['pr'], [`${c.heading}\n${c.intro}`, ...c.body], { select, buttons });
}

module.exports = { buildPrPanel };
