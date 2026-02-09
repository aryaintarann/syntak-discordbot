import { Events } from 'discord.js';
import LoggingManager from '../utils/loggingManager.js';

export default {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        try {
            await LoggingManager.logVoiceUpdate(oldState, newState);
        } catch (error) {
            console.error('Error in voiceStateUpdate event:', error);
        }
    }
};
