const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { db } = require('../utils/appDb');
const config = require('../config.json');

const PAGE_SIZE = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status) {
  if (status === 'approved') return '<:Check:1494830681484824616> Approved';
  if (status === 'denied')   return '<:Cancel:1494830662581092482> Denied';
  return '<:Dot:1496643767585865818> Pending';
}

function statusColor(type, status) {
  if (type === 'application') {
    if (status === 'approved') return 0x57F287;
    if (status === 'denied')   return 0xED4245;
    return 0xFEE75C;
  }
  return status === 'denied' ? 0xED4245 : 0x5865F2;
}

function buildQuery(type, filters) {
  const table = type === 'application' ? 'applications' : 'suggestions';
  const conditions = [];
  const params = [];

  if (filters.id) {
    conditions.push('id = ?');
    params.push(filters.id.toUpperCase());
  }
  if (filters.userId) {
    conditions.push('user_id = ?');
    params.push(filters.userId);
  }
  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { table, where, params };
}

function buildListEmbed(type, rows, page, total) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const typeLabel  = type === 'application' ? 'Applications' : 'Suggestions';

  const lines = rows.map(r => {
    const badge = statusBadge(r.status);
    const date  = `<t:${r.submitted_at}:d>`;
    return type === 'application'
      ? `**${r.id}** — ${r.username} • ${r.role} • ${badge} • ${date}`
      : `**${r.id}** — ${r.title} • ${badge} • ${date}`;
  });

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`<:Dot:1496643767585865818> ${typeLabel} Search Results`)
    .setDescription(lines.join('\n') || 'No results.')
    .setFooter({ text: `Page ${page + 1} of ${totalPages} • ${total} total` })
    .setTimestamp();
}

function buildDetailEmbed(type, row, requestedBy) {
  if (type === 'application') {
    const fields = [
      { name: 'Age',          value: row.age,      inline: true },
      { name: 'Timezone',     value: row.timezone, inline: true },
      { name: 'Role',         value: row.role,     inline: true },
      { name: 'Status',       value: statusBadge(row.status), inline: true },
      { name: 'Submitted At', value: `<t:${row.submitted_at}:F>`, inline: true },
      { name: 'Reason',       value: row.reason,     inline: false },
      { name: 'Experience',   value: row.experience, inline: false },
    ];
    if (row.reviewed_by) {
      fields.push({ name: 'Reviewed By', value: `<@${row.reviewed_by}>`, inline: true });
      fields.push({ name: 'Reviewed At', value: `<t:${row.reviewed_at}:F>`, inline: true });
    }
    return new EmbedBuilder()
      .setColor(statusColor('application', row.status))
      .setTitle(`${row.id} — ${row.username}`)
      .addFields(fields)
      .setFooter({ text: `Requested by ${requestedBy}` })
      .setTimestamp();
  }

  // Suggestion detail
  const fields = [
    { name: 'Category',     value: row.category,   inline: true },
    { name: 'Status',       value: statusBadge(row.status), inline: true },
    { name: 'Submitted By', value: `${row.username} (${row.user_id})`, inline: true },
    { name: 'Upvotes',      value: String(row.upvotes),   inline: true },
    { name: 'Downvotes',    value: String(row.downvotes), inline: true },
    { name: 'Submitted At', value: `<t:${row.submitted_at}:F>`, inline: true },
    { name: 'Details',      value: row.details, inline: false },
  ];
  if (row.reviewed_by) {
    fields.push({ name: 'Reviewed By', value: `<@${row.reviewed_by}>`, inline: true });
  }
  return new EmbedBuilder()
    .setColor(statusColor('suggestion', row.status))
    .setTitle(`${row.id} — ${row.title}`)
    .addFields(fields)
    .setFooter({ text: `Requested by ${requestedBy}` })
    .setTimestamp();
}

function navButtons(type, page, maxPage, status, id, userId) {
  const s  = status || '_';
  const i  = id     || '_';
  const u  = userId || '_';
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`search_nav:prev:${type}:${page}:${s}:${i}:${u}`)
      .setLabel('Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`search_nav:next:${type}:${page}:${s}:${i}:${u}`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= maxPage),
  );
}

// ── Main search execution (called from /search command) ───────────────────────

async function executeSearch(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member || !member.roles.cache.has(config.roles.admin)) {
    return interaction.reply({
      content: '<:Cancel:1494830662581092482> You do not have permission to use this command.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const type     = interaction.options.getString('type');
  const searchId = interaction.options.getString('id');
  const user     = interaction.options.getUser('user');
  const status   = interaction.options.getString('status');

  const filters = {
    id:     searchId || null,
    userId: user?.id || null,
    status: status   || null,
  };

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const { table, where, params } = buildQuery(type, filters);

  // Single record lookup by ID
  if (filters.id) {
    const row = db.prepare(`SELECT * FROM ${table} ${where}`).get(...params);
    if (!row) {
      return interaction.editReply({ content: '<:Cancel:1494830662581092482> No results found for those filters.' });
    }
    return interaction.editReply({ embeds: [buildDetailEmbed(type, row, interaction.user.tag)] });
  }

  // Paginated list
  const total = db.prepare(`SELECT COUNT(*) as count FROM ${table} ${where}`).get(...params).count;
  if (total === 0) {
    return interaction.editReply({ content: '<:Cancel:1494830662581092482> No results found for those filters.' });
  }

  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  const rows    = db.prepare(`SELECT * FROM ${table} ${where} ORDER BY submitted_at DESC LIMIT ? OFFSET ?`)
    .all(...params, PAGE_SIZE, 0);

  const embed      = buildListEmbed(type, rows, 0, total);
  const components = total > PAGE_SIZE
    ? [navButtons(type, 0, maxPage, filters.status, filters.id, filters.userId)]
    : [];

  await interaction.editReply({ embeds: [embed], components });
}

// ── Pagination button handler (called from componentHandler) ──────────────────

async function handleSearchNav(interaction) {
  // search_nav:{dir}:{type}:{page}:{status}:{id}:{userId}
  const [, dir, type, pageStr, statusVal, idVal, userIdVal] = interaction.customId.split(':');
  let page = parseInt(pageStr, 10);
  if (dir === 'next') page++;
  else if (dir === 'prev') page--;
  if (page < 0) page = 0;

  const filters = {
    id:     idVal     !== '_' ? idVal     : null,
    userId: userIdVal !== '_' ? userIdVal : null,
    status: statusVal !== '_' ? statusVal : null,
  };

  const { table, where, params } = buildQuery(type, filters);
  const total   = db.prepare(`SELECT COUNT(*) as count FROM ${table} ${where}`).get(...params).count;
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  if (page > maxPage) page = maxPage;

  const rows  = db.prepare(`SELECT * FROM ${table} ${where} ORDER BY submitted_at DESC LIMIT ? OFFSET ?`)
    .all(...params, PAGE_SIZE, page * PAGE_SIZE);
  const embed = buildListEmbed(type, rows, page, total);

  await interaction.update({
    embeds: [embed],
    components: [navButtons(type, page, maxPage, filters.status, filters.id, filters.userId)],
  });
}

module.exports = { executeSearch, handleSearchNav };
