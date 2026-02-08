import dotenv from 'dotenv';
dotenv.config();

// Anti-raid configuration
export const antiRaidConfig = {
    enabled: true,

    // Raid detection thresholds
    joinThreshold: parseInt(process.env.RAID_THRESHOLD) || 10, // Jumlah user joins
    timeWindow: parseInt(process.env.RAID_TIME_WINDOW) || 10000, // dalam milliseconds (10 detik)

    // Actions saat raid terdeteksi
    autoLockdown: true, // Otomatis lockdown saat raid
    lockdownDuration: 600000, // 10 menit

    // Notification
    notifyAdmins: true,
    alertChannel: null, // Set via config atau ambil dari mod log channel

    // Account age verification
    minAccountAge: 604800000, // 7 hari (dalam ms)
    kickNewAccounts: false, // Kick account baru saat raid

    // Verification level
    raiseVerificationLevel: false, // Naikkan verification level saat raid
};

// Lockdown settings
export const lockdownConfig = {
    // Which channels to lock (null = all channels)
    channelsToLock: null, // Array of channel IDs atau null untuk semua

    // Which channels to skip (seperti mod channels)
    exemptChannels: ['mod-chat', 'admin-only'], // Channel names atau IDs

    // What permissions to remove
    restrictPermissions: [
        'SendMessages',
        'AddReactions',
        'CreatePublicThreads',
        'CreatePrivateThreads',
        'SendMessagesInThreads'
    ],

    // Notification message
    lockdownMessage: '🔒 **Server dalam mode lockdown!**\nAdmin sedang menangani situasi. Mohon tunggu hingga lockdown dicabut.',
};

// Raid severity levels
export const raidSeverity = {
    LOW: {
        threshold: 5,
        actions: ['notify']
    },
    MEDIUM: {
        threshold: 10,
        actions: ['notify', 'lockdown']
    },
    HIGH: {
        threshold: 20,
        actions: ['notify', 'lockdown', 'raise_verification']
    },
    CRITICAL: {
        threshold: 30,
        actions: ['notify', 'lockdown', 'raise_verification', 'kick_new_accounts']
    }
};

/**
 * Determine raid severity based on join count
 */
export function getRaidSeverity(joinCount) {
    if (joinCount >= raidSeverity.CRITICAL.threshold) return 'CRITICAL';
    if (joinCount >= raidSeverity.HIGH.threshold) return 'HIGH';
    if (joinCount >= raidSeverity.MEDIUM.threshold) return 'MEDIUM';
    if (joinCount >= raidSeverity.LOW.threshold) return 'LOW';
    return 'NONE';
}
