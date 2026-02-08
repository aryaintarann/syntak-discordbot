import dotenv from 'dotenv';
dotenv.config();

export default {
    // Discord Configuration
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    prefix: process.env.PREFIX || '!',
    ownerId: process.env.BOT_OWNER_ID,

    // Database
    database: {
        path: process.env.DATABASE_PATH || './database.sqlite',
        logging: false
    },

    // Spotify API
    spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET
    },

    // Shorthand references for easier access
    spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
    spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,

    // Lyrics API
    genius: {
        apiKey: process.env.GENIUS_API_KEY
    },

    // Moderation Settings
    moderation: {
        antiSpamEnabled: process.env.ANTI_SPAM_ENABLED === 'true',
        antiRaidEnabled: process.env.ANTI_RAID_ENABLED === 'true',
        maxMentions: parseInt(process.env.MAX_MENTIONS) || 5,
        maxMessagesPerMinute: parseInt(process.env.MAX_MESSAGES_PER_MINUTE) || 10,
        badWords: [
            // Add your bad words list here
            'badword1',
            'badword2'
        ]
    },

    // Economy Settings
    economy: {
        dailyReward: parseInt(process.env.DAILY_REWARD) || 500,
        workMin: parseInt(process.env.WORK_MIN) || 100,
        workMax: parseInt(process.env.WORK_MAX) || 500,
        crimeMin: parseInt(process.env.CRIME_MIN) || 1000,
        crimeMax: parseInt(process.env.CRIME_MAX) || 5000,
        crimeFailPenalty: parseInt(process.env.CRIME_FAIL_PENALTY) || 500
    },

    // Leveling Settings
    leveling: {
        xpPerMessage: parseInt(process.env.XP_PER_MESSAGE) || 15,
        xpMessageCooldown: parseInt(process.env.XP_MESSAGE_COOLDOWN) || 60,
        xpVoicePerMinute: parseInt(process.env.XP_VOICE_PER_MINUTE) || 10,
        levelFormula: (level) => level * level * 100, // XP required for next level
        roleRewards: {
            // Level: Role ID
            // Example: 5: '1234567890123456789'
        }
    },

    // Colors for embeds
    colors: {
        primary: 0x5865F2,
        success: 0x57F287,
        warning: 0xFEE75C,
        error: 0xED4245,
        info: 0x5865F2
    }
};
