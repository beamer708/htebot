const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const welcomeChannel = member.guild.channels.cache.get(config.channels.welcome);
    if (welcomeChannel) {
      const dashboardUrl = `https://discord.com/channels/${member.guild.id}/${config.channels.rolePanels}`;

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setDescription(`Hey <@${member.id}>, welcome to **HowToERLC**.\n\nWe're the leading resource hub for building and running ERLC communities on Roblox. Head to the dashboard to get your roles and explore what we offer.`)
        .setFooter({ text: `HowToERLC — Member #${member.guild.memberCount}` });

      const dashboardBtn = new ButtonBuilder()
        .setLabel('View Dashboard')
        .setStyle(ButtonStyle.Link)
        .setURL(dashboardUrl);

      await welcomeChannel.send({
        content: `<@${member.id}>`,
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(dashboardBtn)],
      });
    }

    const logChannel = member.guild.channels.cache.get(config.channels.logs);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('Member Joined')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true },
        )
        .setFooter({ text: 'HowToERLC' })
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] });
    }
  },
};
