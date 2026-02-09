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
 * Run all filters on message content
 */
export function checkAllFilters(content, options = {}) {
    const {
        checkBadWordsFilter = true,
        checkLinkSpamFilter = true,
        checkMassMentionFilter = true,
        checkInviteLinksFilter = true,
        checkCapsSpamFilter = false,
        customBadWords = null,
        caseSensitive = false,
        maxLinks = 3,
        maxMentions = 5,
        allowOwnServer = true,
        guildInviteCodes = []
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

    return {
        hasViolations: violations.length > 0,
        violations
    };
}
