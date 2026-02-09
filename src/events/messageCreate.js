import { Events } from 'discord.js';
import { checkAllFilters } from '../automod/filters.js';
import { enforceViolation, checkSpam } from '../automod/enforcer.js';
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

            // Check content filters with per-filter channel exemptions
            const channelId = message.channel.id;
            const filterResults = checkAllFilters(message.content, {
                checkBadWordsFilter: customBadWords ? customBadWords.length > 0 : autoModConfig.badWords.enabled,
                checkLinkSpamFilter: filterConfig.linkSpam.enabled && !filterConfig.linkSpam.exemptChannels.includes(channelId),
                checkMassMentionFilter: filterConfig.massMention.enabled && !filterConfig.massMention.exemptChannels.includes(channelId),
                checkInviteLinksFilter: filterConfig.inviteLinks.enabled && !filterConfig.inviteLinks.exemptChannels.includes(channelId),
                checkCapsSpamFilter: filterConfig.caps.enabled && !filterConfig.caps.exemptChannels.includes(channelId),
                customBadWords: customBadWords, // Pass custom bad words from dashboard
                caseSensitive: autoModConfig.badWords.caseSensitive,
                maxLinks: autoModConfig.linkSpam.maxLinks,
                maxMentions: autoModConfig.massMention.maxMentions,
                allowOwnServer: autoModConfig.inviteLinks.allowOwnServer,
                guildInviteCodes: [] // TODO: fetch server's own invite codes if needed
            });

            // If violations found, enforce them
            if (filterResults.hasViolations) {
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
                        default:
                            continue;
                    }

                    // Enforce violation
                    await enforceViolation(message, violation, violationConfig);

                    // Only enforce first violation to avoid spam
                    break;
                }
            }

        } catch (error) {
            console.error('Error in messageCreate event:', error);
        }
    }
};
