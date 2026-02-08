import { Events } from 'discord.js';
import { initializeDatabase, cleanOldJoinEntries } from '../database/database.js';

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`✅ Logged in as ${client.user.tag}`);
        console.log(`📊 Serving ${client.guilds.cache.size} servers`);

        // Initialize database
        try {
            await initializeDatabase();
            console.log('✅ Database initialized');
        } catch (error) {
            console.error('❌ Failed to initialize database:', error);
            process.exit(1);
        }

        // Clean old join entries every hour
        setInterval(async () => {
            await cleanOldJoinEntries();
            console.log('🧹 Cleaned old join entries');
        }, 3600000); // 1 hour

        console.log('🤖 Bot is ready!');
    }
};
