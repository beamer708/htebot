const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  ActionRowBuilder, StringSelectMenuBuilder,
  MessageFlags, resolveColor,
} = require('discord.js');

async function sendStaffHandbook(interaction) {
  const handbookMenu = new StringSelectMenuBuilder()
    .setCustomId('staff:handbook')
    .setPlaceholder('Staff Handbook — Select a section')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions([
      {
        label: 'Your Role',
        description: 'What you are responsible for as a staff member',
        value: 'role',
        emoji: { name: 'Target', id: '1507191539892224211' },
      },
      {
        label: 'Server & Advertising Rules',
        description: 'How to handle rule violations and ad breaches',
        value: 'rules',
        emoji: { name: 'shieldcheck', id: '1507191534003552277' },
      },
      {
        label: 'Welcoming Members',
        description: 'How to greet and onboard new members',
        value: 'welcoming',
        emoji: { name: 'userplus', id: '1507191546813091841' },
      },
      {
        label: 'Support Tickets',
        description: 'When and how to handle support tickets',
        value: 'tickets',
        emoji: { name: 'Headset', id: '1507191521407926322' },
      },
      {
        label: 'Bot Commands',
        description: 'What commands you have access to and what they do',
        value: 'commands',
        emoji: { name: 'clipboardlist', id: '1507191509563473962' },
      },
    ]);

  const container = new ContainerBuilder()
    .setAccentColor(resolveColor('#4ade80'))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '<:howtoglogo:1494830728113033327> **HowToERLC — Staff Handbook**\n\n' +
        'This handbook covers everything you need to know as a staff member. ' +
        'Use the menu below to navigate each section. Read all sections before taking any action in the server.'
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(new ActionRowBuilder().addComponents(handbookMenu));

  await interaction.channel.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

module.exports = { sendStaffHandbook };
