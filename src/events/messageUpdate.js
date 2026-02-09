import { Events } from 'discord.js';
import LoggingManager from '../utils/loggingManager.js';

export default {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        // Ignore bot messages and DMs
        if (newMessage.author?.bot || !newMessage.guild) return;

        // Ignore if content hasn't changed
        if (oldMessage.content === newMessage.content) return;

        // Ignore partial messages
        if (!oldMessage.content) return;

        try {
            await LoggingManager.logMessageEdit(oldMessage, newMessage);
        } catch (error) {
            console.error('Error in messageUpdate event:', error);
        }
    }
};
