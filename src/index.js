import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { Player } from 'discord-player';
import config from './config/config.js';
import logger from './utils/logger.js';
import { syncDatabase } from './database/index.js';
import commandHandler from './handlers/commandHandler.js';
import eventHandler from './handlers/eventHandler.js';

// Create Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember
    ]
});

// Initialize music player
const player = new Player(client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25
    }
});

// Load default extractors for music sources
await player.extractors.loadDefault((ext) => ext !== 'YouTubeExtractor');

client.player = player;

// Collections for cooldowns and temporary data
client.cooldowns = new Collection();
client.voiceTracking = new Collection(); // For voice XP tracking
client.messageTracking = new Collection(); // For anti-spam

// Initialize bot
async function init() {
    try {
        // Connect to database
        await syncDatabase();

        // Load handlers
        await commandHandler(client);
        await eventHandler(client);

        // Login to Discord
        await client.login(config.token);
    } catch (error) {
        logger.error('Failed to initialize bot:', error);
        process.exit(1);
    }
}

// Error handling
process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

// Start the bot
init();

export default client;
