import { Events } from 'discord.js';
import pool from '../database/database.js';

export default {
    name: Events.MessageReactionAdd,
    async execute(reaction, user) {
        if (user.bot) return;

        // Fetch partials
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Something went wrong when fetching the message:', error);
                return;
            }
        }

        const { message, emoji } = reaction;

        try {
            // detailed logging for debugging
            console.log(`[ReactionAdd] Checking reaction: ${emoji.name} (ID: ${emoji.id}) on message ${message.id} by user ${user.id}`);

            const [rows] = await pool.query(
                'SELECT role_id, emoji FROM reaction_roles WHERE message_id = ?',
                [message.id]
            );

            // Find matching role
            // Checks:
            // 1. Exact string match (Unicode: ✅, Custom stored as <a:name:id>: <a:name:id>)
            // 2. Name only (Simple custom: name)
            // 3. Full constructed tag (<:name:id>)
            // 4. Name:ID format (Stored by route.ts: name:id)
            const roleConfig = rows.find(r =>
                r.emoji === emoji.toString() ||
                r.emoji === emoji.name ||
                r.emoji === `<:${emoji.name}:${emoji.id}>` ||
                r.emoji === `${emoji.name}:${emoji.id}`
            );

            if (!roleConfig) {
                console.log(`[ReactionAdd] No role config found for emoji ${emoji.toString()} or ${emoji.name}`);
                return;
            }

            const roleId = roleConfig.role_id;
            console.log(`[ReactionAdd] Found role ID: ${roleId}`);
            const member = await message.guild.members.fetch(user.id);

            if (member && !member.roles.cache.has(roleId)) {
                await member.roles.add(roleId);
                console.log(`[ReactionAdd] Added role ${roleId} to user ${user.tag}`);
            } else {
                console.log(`[ReactionAdd] User already has role or member not found.`);
            }
        } catch (error) {
            console.error('Error handling reaction add:', error);
        }
    }
};
