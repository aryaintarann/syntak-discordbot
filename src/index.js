import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { DisTube } from 'distube';
import { SpotifyPlugin } from '@distube/spotify';
import { YtDlpPlugin } from '@distube/yt-dlp';

import ffmpeg from 'ffmpeg-static';
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

// Initialize DisTube
const distube = new DisTube(client, {
    ffmpeg: {
        path: ffmpeg
    },
    emitNewSongOnly: true,
    emitAddSongWhenCreatingQueue: false,
    plugins: [
        new SpotifyPlugin({
            api: {
                clientId: config.spotifyClientId,
                clientSecret: config.spotifyClientSecret
            }
        }),
        new YtDlpPlugin({ update: true })
    ]
});

// DisTube Events
distube.on('playSong', (queue, song) => {
    logger.info(`Now playing: ${song.name} in ${queue.textChannel?.guild.name}`);
    queue.textChannel?.send(`🎵 **Now Playing:** ${song.name} - \`${song.formattedDuration}\``);
});

distube.on('addSong', (queue, song) => {
    logger.info(`Track added to queue: ${song.name}`);
    queue.textChannel?.send(`✅ **Added to queue:** ${song.name} - \`${song.formattedDuration}\``);
});

distube.on('addList', (queue, playlist) => {
    logger.info(`Playlist added: ${playlist.name} (${playlist.songs.length} songs)`);
    queue.textChannel?.send(`✅ **Added playlist:** ${playlist.name} (${playlist.songs.length} songs) - \`${playlist.formattedDuration}\``);
});

distube.on('error', (error, queue, song) => {
    logger.error('DisTube error:', error);
    if (queue && queue.textChannel) {
        queue.textChannel.send(`❌ Error music player: ${error.toString().slice(0, 100)}...`);
    } else {
        logger.error('No queue/textChannel for error notification');
    }
});

distube.on('finish', (queue) => {
    logger.info('Queue finished');
});

client.distube = distube;

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
