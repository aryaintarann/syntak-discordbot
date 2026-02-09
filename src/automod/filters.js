import { badWords, patterns, violationTypes } from '../config/automod.js';

/**
 * Check for bad words in message content
 */
export function checkBadWords(content, customBadWords = null, caseSensitive = false) {
    // Use custom bad words from database if provided, otherwise use default
    const wordList = customBadWords || badWords;

    const text = caseSensitive ? content : content.toLowerCase();
    const wordsToCheck = caseSensitive ? wordList : wordList.map(w => w.toLowerCase());

    for (const badWord of wordsToCheck) {
        // Check for whole word match (with word boundaries)
        const regex = new RegExp(`\\b${badWord}\\b`, 'gi');
        if (regex.test(text)) {
            return {
                violated: true,
                type: violationTypes.BAD_WORD,
                details: `Contains bad word: ${badWord}`
            };
        }

        // Also check for variations with special characters (e.g., "a$s", "sh!t")
        const sanitized = text.replace(/[^a-z0-9]/gi, '');
        const badWordSanitized = badWord.replace(/[^a-z0-9]/gi, '');
        if (sanitized.includes(badWordSanitized)) {
            return {
                violated: true,
                type: violationTypes.BAD_WORD,
                details: `Contains bad word variation: ${badWord}`
            };
        }
    }

    return { violated: false };
}

/**
 * Check for link spam
 */
export function checkLinkSpam(content, maxLinks = 3) {
    const links = content.match(patterns.urlPattern);
    const linkCount = links ? links.length : 0;

    if (linkCount > maxLinks) {
        return {
            violated: true,
            type: violationTypes.LINK_SPAM,
            details: `Too many links: ${linkCount} (max: ${maxLinks})`,
            linkCount
        };
    }

    return { violated: false };
}

/**
 * Check for mass mentions
 */
export function checkMassMention(content, maxMentions = 5) {
    const mentions = content.match(patterns.mentionPattern);
    const mentionCount = mentions ? mentions.length : 0;

    if (mentionCount > maxMentions) {
        return {
            violated: true,
            type: violationTypes.MASS_MENTION,
            details: `Too many mentions: ${mentionCount} (max: ${maxMentions})`,
            mentionCount
        };
    }

    return { violated: false };
}

/**
 * Check for invite links from other servers
 */
export function checkInviteLinks(content, allowOwnServer = true, guildInviteCodes = []) {
    const invites = content.match(patterns.inviteLink);

    if (!invites || invites.length === 0) {
        return { violated: false };
    }

    // If allowing own server invites, check if it's from this server
    if (allowOwnServer && guildInviteCodes.length > 0) {
        const isOwnInvite = invites.some(invite => {
            const code = invite.split('/').pop();
            return guildInviteCodes.includes(code);
        });

        if (isOwnInvite) {
            return { violated: false };
        }
    }

    return {
        violated: true,
        type: violationTypes.INVITE_LINK,
        details: 'Contains Discord invite link from another server',
        invites
    };
}

/**
 * Check for all caps spam
 */
export function checkCapsSpam(content, threshold = 0.7, minLength = 10) {
    // Skip if message is too short
    if (content.length < minLength) {
        return { violated: false };
    }

    // Remove spaces and special chars for accurate count
    const letters = content.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) return { violated: false };

    const uppercaseCount = content.replace(/[^A-Z]/g, '').length;
    const capsRatio = uppercaseCount / letters.length;

    if (capsRatio >= threshold) {
        return {
            violated: true,
            type: violationTypes.CAPS_SPAM,
            details: `Too many caps: ${Math.round(capsRatio * 100)}% (threshold: ${threshold * 100}%)`
        };
    }

    return { violated: false };
}

/**
 * Check for emoji spam
 */
export function checkEmojiSpam(content, maxEmojis = 10) {
    // Regex to match unicode emojis and discord custom emojis <a:name:id>
    const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|<a?:\w+:\d+>)/g;
    const emojis = content.match(emojiRegex);
    const emojiCount = emojis ? emojis.length : 0;

    if (emojiCount > maxEmojis) {
        return {
            violated: true,
            type: violationTypes.EMOJI_SPAM,
            details: `Too many emojis: ${emojiCount} (max: ${maxEmojis})`,
            emojiCount
        };
    }
    return { violated: false };
}

/**
 * Check for newline spam
 */
export function checkNewlineSpam(content, maxNewlines = 10) {
    const newlines = (content.match(/\n/g) || []).length;

    if (newlines > maxNewlines) {
        return {
            violated: true,
            type: violationTypes.NEWLINE_SPAM,
            details: `Too many newlines: ${newlines} (max: ${maxNewlines})`,
            newlineCount: newlines
        };
    }
    return { violated: false };
}

/**
 * Check duplicate messages (requires state passed in options)
 */
export function checkDuplicateMessage(content, previousMessages = []) {
    // Check if content matches any recent message
    // previousMessages should be array of { content: string, timestamp: number }
    const isDuplicate = previousMessages.some(msg => msg.content === content);

    if (isDuplicate) {
        return {
            violated: true,
            type: violationTypes.DUPLICATE,
            details: 'Repeated message detected'
        };
    }
    return { violated: false };
}

/**
 * Check custom regex filters
 */
export function checkRegexFilters(content, filters = []) {
    // filters: [{ pattern: string, flags: string, name: string }]
    for (const filter of filters) {
        try {
            const regex = new RegExp(filter.pattern, filter.flags || 'i');
            if (regex.test(content)) {
                return {
                    violated: true,
                    type: violationTypes.REGEX_FILTER,
                    details: `Matched filter: ${filter.name || 'Custom Patern'}`
                };
            }
        } catch (e) {
            console.error(`Invalid regex filter: ${filter.pattern}`, e);
        }
    }
    return { violated: false };
}

/**
 * Run all filters on message content
 */
export function checkAllFilters(content, options = {}) {
    const {
        checkBadWordsFilter = true,
        checkLinkSpamFilter = true,
        checkMassMentionFilter = true,
        checkInviteLinksFilter = true,
        checkCapsSpamFilter = false,
        checkEmojiSpamFilter = false,
        checkNewlineSpamFilter = false,
        checkDuplicateFilter = false,
        checkRegex = false,

        customBadWords = null,
        caseSensitive = false,
        maxLinks = 3,
        maxMentions = 5,
        maxEmojis = 10,
        maxNewlines = 10,
        allowOwnServer = true,
        guildInviteCodes = [],
        previousMessages = [], // For duplicate check
        regexFilters = [] // For custom regex
    } = options;

    const violations = [];

    if (checkBadWordsFilter) {
        const result = checkBadWords(content, customBadWords, caseSensitive);
        if (result.violated) violations.push(result);
    }

    if (checkLinkSpamFilter) {
        const result = checkLinkSpam(content, maxLinks);
        if (result.violated) violations.push(result);
    }

    if (checkMassMentionFilter) {
        const result = checkMassMention(content, maxMentions);
        if (result.violated) violations.push(result);
    }

    if (checkInviteLinksFilter) {
        const result = checkInviteLinks(content, allowOwnServer, guildInviteCodes);
        if (result.violated) violations.push(result);
    }

    if (checkCapsSpamFilter) {
        const result = checkCapsSpam(content);
        if (result.violated) violations.push(result);
    }

    if (checkEmojiSpamFilter) {
        const result = checkEmojiSpam(content, maxEmojis);
        if (result.violated) violations.push(result);
    }

    if (checkNewlineSpamFilter) {
        const result = checkNewlineSpam(content, maxNewlines);
        if (result.violated) violations.push(result);
    }

    if (checkDuplicateFilter) {
        const result = checkDuplicateMessage(content, previousMessages);
        if (result.violated) violations.push(result);
    }

    if (checkRegex) {
        const result = checkRegexFilters(content, regexFilters);
        if (result.violated) violations.push(result);
    }

    return {
        hasViolations: violations.length > 0,
        violations
    };
}
