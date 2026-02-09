import { Events } from 'discord.js';
import { createMessageEditEmbed } from '../utils/embedBuilder.js';
import pool from '../database/database.js';

export default {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        // Ignore bot messages
        if (newMessage.author?.bot) return;

        // Ignore DMs
        if (!newMessage.guild) return;

        // Ignore if content hasn't changed (embed updates, etc)
        if (oldMessage.content === newMessage.content) return;

        // Ignore if no old content (partial message)
        if (!oldMessage.content) return;

        try {
            // Get mod log channel
            const [rows] = await pool.query(
                'SELECT mod_log_channel FROM guild_config WHERE guild_id = ?',
                [newMessage.guild.id]
            );

            if (!rows || rows.length === 0 || !rows[0].mod_log_channel) return;

            const logChannel = newMessage.guild.channels.cache.get(rows[0].mod_log_channel);
            if (!logChannel) return;

            // Create and send embed
            const embed = createMessageEditEmbed(oldMessage, newMessage);

            await logChannel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error in messageUpdate event:', error);
        }
    }
};
