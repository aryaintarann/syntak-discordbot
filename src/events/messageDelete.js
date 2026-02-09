import { Events } from 'discord.js';
import { createMessageDeleteEmbed } from '../utils/embedBuilder.js';
import pool from '../database/database.js';

export default {
    name: Events.MessageDelete,
    async execute(message) {
        // Ignore bot messages
        if (message.author?.bot) return;

        // Ignore DMs
        if (!message.guild) return;

        // Ignore messages without content (embeds only, etc)
        if (!message.content && message.attachments.size === 0) return;

        try {
            // Get mod log channel
            const [rows] = await pool.query(
                'SELECT mod_log_channel FROM guild_config WHERE guild_id = ?',
                [message.guild.id]
            );

            if (!rows || rows.length === 0 || !rows[0].mod_log_channel) return;

            const logChannel = message.guild.channels.cache.get(rows[0].mod_log_channel);
            if (!logChannel) return;

            // Create and send embed
            const embed = createMessageDeleteEmbed(message);

            await logChannel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error in messageDelete event:', error);
        }
    }
};
