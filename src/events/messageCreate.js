import { Events, EmbedBuilder } from 'discord.js';
import { checkAllFilters } from '../automod/filters.js';
import { enforceViolation, checkSpam, trackMessage, getUserHistory } from '../automod/enforcer.js';
import { autoModConfig } from '../config/automod.js';
import { getGuildConfig } from '../database/models/GuildConfig.js';
import { getAutomodConfig } from '../database/models/AutomodConfig.js';
import { hasExemptRole, isModerator } from '../utils/permissions.js';

export default {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bot messages
        if (message.author.bot) return;

        // Ignore DMs
        if (!message.guild) return;

        try {
            // Get guild config
            const config = await getGuildConfig(message.guild.id);

            // Check if auto-mod is enabled
            if (!config.auto_mod_enabled) return;

            // Skip moderators/admins
            if (isModerator(message.member)) return;

            // Get custom automod config from database
            const customAutomod = await getAutomodConfig(message.guild.id);

            // Merge with default config
            const spamConfig = customAutomod?.spam || autoModConfig.spam;
            const customBadWords = customAutomod?.badWords || null;

            // Parse filter config - handle both old and new structure
            const filters = customAutomod?.filters || {};
            const filterConfig = {
                linkSpam: {
                    enabled: typeof filters.linkSpam === 'object' ? filters.linkSpam.enabled : (filters.linkSpam !== false),
                    exemptChannels: typeof filters.linkSpam === 'object' ? (filters.linkSpam.exemptChannels || []) : []
                },
                massMention: {
                    enabled: typeof filters.massMention === 'object' ? filters.massMention.enabled : (filters.massMention !== false),
                    exemptChannels: typeof filters.massMention === 'object' ? (filters.massMention.exemptChannels || []) : []
                },
                inviteLinks: {
                    enabled: typeof filters.inviteLinks === 'object' ? filters.inviteLinks.enabled : (filters.inviteLinks !== false),
                    exemptChannels: typeof filters.inviteLinks === 'object' ? (filters.inviteLinks.exemptChannels || []) : []
                },
                caps: {
                    enabled: typeof filters.caps === 'object' ? filters.caps.enabled : (filters.caps === true),
                    exemptChannels: typeof filters.caps === 'object' ? (filters.caps.exemptChannels || []) : []
                }
            };

            // Check spam first
            const spamCheck = checkSpam(
                message.author.id,
                spamConfig.messageThreshold,
                spamConfig.timeWindow * 1000 // Convert to milliseconds
            );

            if (spamCheck.isSpam && autoModConfig.spam.enabled) {
                // Handle spam
                try {
                    await message.delete();
                    await message.member.timeout(
                        autoModConfig.spam.timeoutDuration,
                        'Spam detection'
                    );

                    message.channel.send(`${message.author}, ⚠️ Anda mengirim pesan terlalu cepat dan telah di-timeout.`)
                        .then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000))
                        .catch(() => { });
                } catch (error) {
                    console.error('Error handling spam:', error);
                }
                return;
            }

            // Custom Regex Filters
            const checkRegex = customAutomod?.regexFilters && customAutomod.regexFilters.length > 0;

            // Get user history for duplicate check
            const userHistory = getUserHistory(message.author.id);

            // Check content filters with per-filter channel exemptions
            const channelId = message.channel.id;

            const filterResults = checkAllFilters(message.content, {
                checkBadWordsFilter: customBadWords ? customBadWords.length > 0 : autoModConfig.badWords.enabled,
                checkLinkSpamFilter: filterConfig.linkSpam.enabled && !filterConfig.linkSpam.exemptChannels.includes(channelId),
                checkMassMentionFilter: filterConfig.massMention.enabled && !filterConfig.massMention.exemptChannels.includes(channelId),
                checkInviteLinksFilter: filterConfig.inviteLinks.enabled && !filterConfig.inviteLinks.exemptChannels.includes(channelId),
                checkCapsSpamFilter: filterConfig.caps.enabled && !filterConfig.caps.exemptChannels.includes(channelId),

                // New Filters
                checkEmojiSpamFilter: customAutomod?.emojiSpam?.enabled,
                checkNewlineSpamFilter: customAutomod?.newlineSpam?.enabled,
                checkDuplicateFilter: customAutomod?.duplicateDetection?.enabled,
                checkRegex: checkRegex,

                customBadWords: customBadWords, // Pass custom bad words from dashboard
                caseSensitive: autoModConfig.badWords.caseSensitive,
                maxLinks: autoModConfig.linkSpam.maxLinks,
                maxMentions: autoModConfig.massMention.maxMentions,
                maxEmojis: customAutomod?.emojiSpam?.maxEmojis || autoModConfig.emojiSpam.maxEmojis,
                maxNewlines: customAutomod?.newlineSpam?.maxNewlines || autoModConfig.newlineSpam.maxNewlines,
                allowOwnServer: autoModConfig.inviteLinks.allowOwnServer,
                guildInviteCodes: [], // TODO: fetch server's own invite codes if needed
                previousMessages: userHistory,
                regexFilters: customAutomod?.regexFilters || []
            });

            // If violations found, enforce them
            if (filterResults.hasViolations) {
                // Track if we enforced something to avoid double punishment
                let enforced = false;

                for (const violation of filterResults.violations) {
                    // Get appropriate config for this violation type
                    let violationConfig;

                    switch (violation.type) {
                        case 'bad_word':
                            violationConfig = autoModConfig.badWords;
                            break;
                        case 'link_spam':
                            violationConfig = autoModConfig.linkSpam;
                            break;
                        case 'mass_mention':
                            violationConfig = autoModConfig.massMention;
                            break;
                        case 'invite_link':
                            violationConfig = autoModConfig.inviteLinks;
                            break;
                        case 'caps_spam':
                            violationConfig = { action: 'delete', sendWarning: true };
                            break;
                        case 'emoji_spam':
                            violationConfig = customAutomod?.emojiSpam || autoModConfig.emojiSpam;
                            break;
                        case 'newline_spam':
                            violationConfig = customAutomod?.newlineSpam || autoModConfig.newlineSpam;
                            break;
                        case 'duplicate':
                            violationConfig = customAutomod?.duplicateDetection || autoModConfig.duplicateDetection;
                            break;
                        case 'regex_filter':
                            violationConfig = { action: 'delete', sendWarning: true, ...customAutomod?.regexFilters?.find(f => new RegExp(f.pattern).test(message.content)) };
                            break;
                        default:
                            continue;
                    }

                    // Enforce violation
                    await enforceViolation(message, violation, violationConfig);
                    enforced = true;

                    // Only enforce first violation to avoid spam
                    break;
                }

                if (enforced) return;
            }

            // Track message for strict duplicate detection (even if not violated yet, or maybe only if valid?)
            // We track valid messages. If it was deleted, we probably shouldn't track it as "previous message" to match against?
            // Actually, for duplicates, we want to detect if they send the same thing again.
            // But if it was deleted, sending it again is still duplicate.
            // So we track it.
            trackMessage(message);

            // Security: Anti-Phishing Check
            const phishingConfig = await FeatureManager.getFeatureConfig(message.guild.id, 'security', 'phishingDetection');
            if (phishingConfig?.enabled) {
                // Basic phishing patterns (can be expanded)
                const phishingPatterns = [
                    /discord\.gift/i,
                    /steamcommunity\.link/i,
                    /free-nitro/i,
                    /discrod\.com/i, // Typosquatting
                    /dlscord\.com/i
                ];

                const isPhishing = phishingPatterns.some(pattern => pattern.test(message.content));

                if (isPhishing) {
                    await message.delete().catch(() => { });

                    const embed = new EmbedBuilder()
                        .setColor(colors.error)
                        .setTitle('🎣 Phishing Link Detected')
                        .setDescription(`**User:** ${message.author.tag} (${message.author.id})\n**Content:** ||${message.content}||\n**Action:** Deleted`)
                        .setTimestamp();

                    await LoggingManager.sendLog(message.guild, 'modLog', embed);

                    // Timeout user for 1 hour
                    await message.member.timeout(60 * 60 * 1000, 'Sending phishing link').catch(() => { });

                    return; // Stop processing
                }
            }

            // Check if auto-mod is enabled (Legacy/Other AutoMod)
            // ... (rest of the file)
        } catch (error) {
            console.error('Error in messageCreate event:', error);
        }
    }
};
