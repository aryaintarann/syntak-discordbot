import { Events } from 'discord.js';
import pool from '../database/database.js';

export default {
    name: Events.MessageReactionRemove,
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
            console.log(`[ReactionRemove] Checking reaction: ${emoji.name} (ID: ${emoji.id}) on message ${message.id} by user ${user.id}`);

            const [rows] = await pool.query(
                'SELECT role_id, emoji FROM reaction_roles WHERE message_id = ?',
                [message.id]
            );

            const roleConfig = rows.find(r =>
                r.emoji === emoji.toString() ||
                r.emoji === emoji.name ||
                r.emoji === `<:${emoji.name}:${emoji.id}>` ||
                r.emoji === `${emoji.name}:${emoji.id}`
            );

            if (!roleConfig) return;

            const roleId = roleConfig.role_id;
            const member = await message.guild.members.fetch(user.id);

            if (member && member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId);
                console.log(`[ReactionRemove] Removed role ${roleId} from user ${user.tag}`);
            }
        } catch (error) {
            console.error('Error handling reaction remove:', error);
        }
    }
};
