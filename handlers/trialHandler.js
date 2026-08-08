// handlers/trialHandler.js — the trial panel's I Agree / Deny buttons
// (customIds trial:agree, trial:deny). Stable ids, so the buttons keep
// working across restarts with no per-message state.
//
// I Agree: add the staff team role (config.trialAgreeRoleId), remove the
//          trial process role (config.trialProcessRoleId).
// Deny:    remove the trial process role.
// Every failure path replies ephemerally and never throws out of here.
const { MessageFlags } = require('discord.js');
const config = require('../config.json');

const SNOWFLAKE = /^\d{17,20}$/;

async function reply(interaction, content) {
  const payload = { content, flags: MessageFlags.Ephemeral };
  try {
    if (interaction.replied || interaction.deferred) return await interaction.followUp(payload);
    return await interaction.reply(payload);
  } catch (err) {
    console.warn('[Trial] Reply failed:', err.message);
  }
}

/** Add/remove with a human-readable failure reason instead of a throw. */
async function tryRole(member, roleId, action, reason) {
  try {
    if (action === 'add') await member.roles.add(roleId, reason);
    else await member.roles.remove(roleId, reason);
    return { ok: true };
  } catch (err) {
    console.warn(`[Trial] Could not ${action} role ${roleId} for ${member.user?.tag}: ${err.message}`);
    return { ok: false, detail: err.message };
  }
}

async function handleTrialButton(interaction) {
  try {
    const action = interaction.customId.split(':')[1]; // agree | deny
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) {
      return reply(interaction, 'Could not load your member data. Try again in a moment.');
    }

    const staffRoleId = config.trialAgreeRoleId;
    const trialRoleId = config.trialProcessRoleId;
    const staffConfigured = SNOWFLAKE.test(staffRoleId || '');
    const trialConfigured = SNOWFLAKE.test(trialRoleId || '');

    if (action === 'agree') {
      if (!staffConfigured) {
        return reply(interaction, 'The staff team role is not configured yet (config.trialAgreeRoleId). Let management know.');
      }

      const added = await tryRole(member, staffRoleId, 'add', 'Agreed to trial terms');
      if (!added.ok) {
        return reply(interaction, `I could not give you the staff team role (${added.detail}). A manager may need to check my role position and permissions.`);
      }

      let note = '';
      if (trialConfigured && member.roles.cache.has(trialRoleId)) {
        const removed = await tryRole(member, trialRoleId, 'remove', 'Agreed to trial terms');
        if (!removed.ok) note = ' (I could not remove your trial process role, a manager will sort that out.)';
      }

      return reply(interaction, `You've agreed to the trial terms and joined the staff team.${note}`);
    }

    if (action === 'deny') {
      if (!trialConfigured) {
        return reply(interaction, 'The trial process role is not configured yet (config.trialProcessRoleId). Let management know.');
      }
      if (!member.roles.cache.has(trialRoleId)) {
        return reply(interaction, "You don't currently have the trial process role, nothing to remove.");
      }

      const removed = await tryRole(member, trialRoleId, 'remove', 'Declined the trial process');
      if (!removed.ok) {
        return reply(interaction, `I could not remove your trial process role (${removed.detail}). A manager may need to check my role position and permissions.`);
      }

      return reply(interaction, "You've declined the trial process.");
    }
  } catch (err) {
    console.error('[Trial] Button error:', err);
    await reply(interaction, 'Something went wrong handling that. Try again or contact management.');
  }
}

module.exports = { handleTrialButton };
