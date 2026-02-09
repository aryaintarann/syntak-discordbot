import { Events, EmbedBuilder } from 'discord.js';
import { trackMemberJoin, detectRaid } from '../antiraid/detector.js';
import { enableLockdown } from '../antiraid/lockdown.js';
import { getGuildConfig } from '../database/models/GuildConfig.js';
import FeatureManager from '../utils/featureManager.js';
import { createRaidAlertEmbed, colors } from '../utils/embedBuilder.js';
import { antiRaidConfig } from '../config/antiraid.js';
import LoggingManager from '../utils/loggingManager.js';
import pool from '../database/database.js';

export default {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            // 1. Log member join
            await LoggingManager.logMemberJoin(member);

            // 2. Account Age Filter
            const accountAgeConfig = await FeatureManager.getFeatureConfig(member.guild.id, 'security', 'accountAge');
            if (accountAgeConfig?.enabled) {
                const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);

                if (accountAgeDays < accountAgeConfig.minDays) {
                    const action = accountAgeConfig.action || 'kick';
                    const reason = `Account age too young (${Math.floor(accountAgeDays)} days, min ${accountAgeConfig.minDays} days)`;

                    // Log the attempt
                    const embed = new EmbedBuilder()
                        .setColor(colors.warn)
                        .setTitle('🛡️ Security Filter Triggered')
                        .setDescription(`**User:** ${member.user.tag} (${member.id})\n**Filter:** Account Age\n**Action:** ${action}\n**Reason:** ${reason}`)
                        .setTimestamp();

                    await LoggingManager.sendLog(member.guild, 'modLog', embed);

                    // Execute action
                    try {
                        if (action === 'kick' && member.kickable) {
                            await member.send(`You were kicked from **${member.guild.name}**. Reason: ${reason}`).catch(() => { });
                            await member.kick(reason);
                            return; // Stop processing
                        } else if (action === 'ban' && member.bannable) {
                            await member.send(`You were banned from **${member.guild.name}**. Reason: ${reason}`).catch(() => { });
                            await member.ban({ reason });
                            return; // Stop processing
                        } else if (action === 'warn') {
                            // Already logged above
                        }
                    } catch (err) {
                        console.error('Failed to execute account age action:', err);
                    }
                }
            }

            // 3. Anti-Raid System
            await trackMemberJoin(member.guild.id, member.id);

            // Check if raid protection is enabled using FeatureManager
            const raidConfig = await FeatureManager.getFeatureConfig(member.guild.id, 'security', 'autoRaidBan');

            if (raidConfig?.enabled) {
                const raidStatus = await detectRaid(member.guild.id);
                if (raidStatus.isRaid && antiRaidConfig.autoLockdown) {
                    console.log(`🚨 RAID DETECTED in ${member.guild.name}! Severity: ${raidStatus.severity}`);

                    await enableLockdown(member.guild, {
                        reason: `Auto-lockdown: Raid detected (${raidStatus.joinCount} joins in ${raidStatus.timeWindow / 1000}s)`
                    });

                    const embed = createRaidAlertEmbed(
                        raidStatus.joinCount,
                        raidStatus.timeWindow,
                        raidStatus.severity
                    );

                    await LoggingManager.sendLog(member.guild, 'modLog', embed);
                }
            }

            // 4. Alt Detection (Simple)
            const altConfig = await FeatureManager.getFeatureConfig(member.guild.id, 'security', 'altDetection');
            if (altConfig?.enabled) {
                // Heuristic: No avatar + young account (< 30 days)
                const isYoung = (Date.now() - member.user.createdTimestamp) < (30 * 24 * 60 * 60 * 1000);
                const hasAvatar = member.user.avatar !== null;

                if (isYoung && !hasAvatar) {
                    const embed = new EmbedBuilder()
                        .setColor(colors.warn)
                        .setTitle('🕵️ Alt Account Detected')
                        .setDescription(`**User:** ${member.user.tag} (${member.id})\n**Reason:** No avatar & Account < 30 days old`)
                        .setTimestamp();

                    await LoggingManager.sendLog(member.guild, 'modLog', embed);
                }
            }

        } catch (error) {
            console.error('Error in guildMemberAdd event:', error);
        }
    }
};
