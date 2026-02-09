import { Events } from 'discord.js';
import { checkAllFilters } from '../automod/filters.js';
import { enforceViolation, checkSpam } from '../automod/enforcer.js';
import { autoModConfig } from '../config/automod.js';
import { getGuildConfig } from '../database/models/GuildConfig.js';
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

            // Check spam first
            const spamCheck = checkSpam(
                message.author.id,
                autoModConfig.spam.messageThreshold,
                autoModConfig.spam.timeWindow
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

            // Check content filters
            const filterResults = checkAllFilters(message.content, {
                checkBadWordsFilter: autoModConfig.badWords.enabled,
                checkLinkSpamFilter: autoModConfig.linkSpam.enabled,
                checkMassMentionFilter: autoModConfig.massMention.enabled,
                checkInviteLinksFilter: autoModConfig.inviteLinks.enabled,
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
