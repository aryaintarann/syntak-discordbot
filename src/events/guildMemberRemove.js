import { Events } from 'discord.js';
import LoggingManager from '../utils/loggingManager.js';

export default {
    name: Events.GuildMemberRemove,
    async execute(member) {
        try {
            // Log leave
            try {
                await LoggingManager.logMemberLeave(member);
            } catch (err) {
                console.error('Error logging leave:', err);
            }

            // Goodbye Message
            const pool = (await import('../database/database.js')).default;
            const [welcomerRows] = await pool.query('SELECT * FROM welcomer_config WHERE guild_id = ?', [member.guild.id]);
            const welcomerConfig = welcomerRows[0];

            if (welcomerConfig && welcomerConfig.goodbye_enabled && welcomerConfig.goodbye_channel_id) {
                const channel = member.guild.channels.cache.get(welcomerConfig.goodbye_channel_id);
                if (channel && channel.isTextBased()) {
                    const { generateWelcomeImage } = await import('../utils/welcomer.js');
                    // Construct proper config object for utility
                    const configForImage = {
                        message: welcomerConfig.goodbye_message,
                        background_url: welcomerConfig.goodbye_background_url
                    };
                    const buffer = await generateWelcomeImage(member, configForImage, 'goodbye');

                    const messageText = welcomerConfig.goodbye_message
                        ? welcomerConfig.goodbye_message
                            .replace(/{user}/g, member.user.tag)
                            .replace(/{server}/g, member.guild.name)
                        : `Goodbye **${member.user.tag}**! You left **${member.guild.name}**.`;

                    await channel.send({
                        content: messageText,
                        files: [{ attachment: buffer, name: 'goodbye.png' }]
                    });
                }
            }
        } catch (error) {
            console.error('Error in guildMemberRemove event:', error);
        }
    }
};
