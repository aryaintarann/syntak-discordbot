import { Events } from 'discord.js';
import LoggingManager from '../utils/loggingManager.js';

export default {
    name: Events.MessageDelete,
    async execute(message) {
        // Ignore bot messages and DMs
        if (message.author?.bot || !message.guild) return;

        // Ignore messages without content
        if (!message.content && message.attachments.size === 0) return;

        try {
            await LoggingManager.logMessageDelete(message);
        } catch (error) {
            console.error('Error in messageDelete event:', error);
        }
    }
};
