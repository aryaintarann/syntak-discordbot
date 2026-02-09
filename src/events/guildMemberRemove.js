import { Events } from 'discord.js';
import LoggingManager from '../utils/loggingManager.js';

export default {
    name: Events.GuildMemberRemove,
    async execute(member) {
        try {
            await LoggingManager.logMemberLeave(member);
        } catch (error) {
            console.error('Error in guildMemberRemove event:', error);
        }
    }
};
