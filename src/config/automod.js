// Daftar kata kasar (bad words) - Indonesia & English
export const badWords = [
    // Indonesia
    'anjing', 'babi', 'bangsat', 'bajingan', 'kampret', 'tolol', 'goblok',
    'bodoh', 'idiot', 'monyet', 'kontol', 'memek', 'ngentot', 'jancok',
    'asu', 'coli', 'colmek', 'jembut', 'perek', 'pelacur', 'sundal',

    // English (add common ones)
    'fuck', 'shit', 'bitch', 'asshole', 'damn', 'crap', 'dick', 'pussy',
    'whore', 'slut', 'bastard', 'ass', 'nigger', 'fag', 'retard'
];

// Regex patterns untuk deteksi
export const patterns = {
    // Discord invite links
    inviteLink: /discord(?:\.gg|app\.com\/invite)\/[\w-]+/gi,

    // General URLs
    urlPattern: /(https?:\/\/[^\s]+)/g,

    // Mention pattern
    mentionPattern: /<@!?(\d+)>/g,

    // IP addresses (untuk block potential DDoS/spam)
    ipPattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,

    // Custom Regex Helper (placeholder, logic handles dynamic regex)
};

// Auto-moderation configuration
export const autoModConfig = {
    // Bad words filter
    badWords: {
        enabled: true,
        caseSensitive: false,
        action: 'delete', // delete, warn, timeout
        sendWarning: true,
        exemptRoles: ['Moderator', 'Admin'], // Role names yang dikecualikan
    },

    // Link spam filter
    linkSpam: {
        enabled: true,
        maxLinks: 3, // Max links dalam satu pesan
        action: 'delete',
        sendWarning: true,
        exemptRoles: ['Moderator', 'Admin', 'Trusted'],
    },

    // Mass mention filter
    massMention: {
        enabled: true,
        maxMentions: 5, // Max mentions dalam satu pesan
        action: 'delete',
        sendWarning: true,
        autoWarn: true, // Otomatis kasih warning
        exemptRoles: ['Moderator', 'Admin'],
    },

    // Invite link filter
    inviteLinks: {
        enabled: true,
        action: 'delete',
        sendWarning: true,
        allowOwnServer: true, // Allow invite dari server sendiri
        exemptRoles: ['Moderator', 'Admin', 'Partner'],
    },

    // Spam detection (rapid messages)
    spam: {
        enabled: true,
        messageThreshold: 5, // Max messages
        timeWindow: 5000, // dalam 5 detik
        action: 'timeout',
        timeoutDuration: 300000, // 5 menit
    },

    // Duplicate message detection
    duplicate: {
        enabled: true,
        timeWindow: 10000, // 10 seconds
        action: 'delete',
        sendWarning: true
    },

    // Emoji spam filter
    emojiSpam: {
        enabled: true,
        maxEmojis: 10,
        action: 'delete',
        sendWarning: true
    },

    // Newline spam filter
    newlineSpam: {
        enabled: true,
        maxNewlines: 10,
        action: 'delete',
        sendWarning: true
    }
};

// Violation types
export const violationTypes = {
    BAD_WORD: 'bad_word',
    LINK_SPAM: 'link_spam',
    MASS_MENTION: 'mass_mention',
    INVITE_LINK: 'invite_link',
    SPAM: 'spam',
    CAPS_SPAM: 'caps_spam',
    DUPLICATE: 'duplicate',
    EMOJI_SPAM: 'emoji_spam',
    NEWLINE_SPAM: 'newline_spam',
    REGEX_FILTER: 'regex_filter'
};

// Warning messages untuk user
export const warningMessages = {
    [violationTypes.BAD_WORD]: '⚠️ Pesan Anda dihapus karena mengandung kata-kata yang tidak pantas.',
    [violationTypes.LINK_SPAM]: '⚠️ Pesan Anda dihapus karena terlalu banyak link.',
    [violationTypes.MASS_MENTION]: '⚠️ Pesan Anda dihapus karena mention spam.',
    [violationTypes.INVITE_LINK]: '⚠️ Pesan Anda dihapus karena mengandung invite link dari server lain.',
    [violationTypes.SPAM]: '⚠️ Anda mengirim pesan terlalu cepat. Mohon perlambat.',
    [violationTypes.CAPS_SPAM]: '⚠️ Jangan menggunakan huruf kapital berlebihan (CAPS LOCK).',
    [violationTypes.DUPLICATE]: '⚠️ Jangan mengirim pesan yang sama berulang kali.',
    [violationTypes.EMOJI_SPAM]: '⚠️ Terlalu banyak emoji dalam satu pesan.',
    [violationTypes.NEWLINE_SPAM]: '⚠️ Pesan Anda terlalu panjang secara vertikal (spam baris baru).',
    [violationTypes.REGEX_FILTER]: '⚠️ Pesan Anda melanggar filter konten server.',
};
