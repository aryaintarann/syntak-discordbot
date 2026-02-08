import { Events } from 'discord.js';
import { trackMemberJoin, detectRaid } from '../antiraid/detector.js';
import { enableLockdown } from '../antiraid/lockdown.js';
import { getGuildConfig } from '../database/models/GuildConfig.js';
import { createRaidAlertEmbed } from '../utils/embedBuilder.js';
import { antiRaidConfig } from '../config/antiraid.js';
import pool from '../database/database.js';

export default {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            // Track the join
            await trackMemberJoin(member.guild.id, member.id);

            // Get guild config
            const config = await getGuildConfig(member.guild.id);

            // Check if raid protection is enabled
            if (!config.raid_protection_enabled) return;

            // Detect raid
            const raidStatus = await detectRaid(member.guild.id);

            if (raidStatus.isRaid && antiRaidConfig.autoLockdown) {
                console.log(`🚨 RAID DETECTED in ${member.guild.name}! Severity: ${raidStatus.severity}`);

                // Enable lockdown
                await enableLockdown(member.guild, {
                    reason: `Auto-lockdown: Raid detected (${raidStatus.joinCount} joins in ${raidStatus.timeWindow / 1000}s)`
                });

                // Notify to mod log channel
                const [rows] = await pool.query(
                    'SELECT mod_log_channel FROM guild_config WHERE guild_id = ?',
                    [member.guild.id]
                );

                if (rows && rows.length > 0 && rows[0].mod_log_channel) {
                    const logChannel = member.guild.channels.cache.get(rows[0].mod_log_channel);

                    if (logChannel) {
                        const embed = createRaidAlertEmbed(
                            raidStatus.joinCount,
                            raidStatus.timeWindow,
                            raidStatus.severity
                        );

                        await logChannel.send({
                            content: `@here **RAID ALERT**`,
                            embeds: [embed]
                        });
                    }
                }
            }

        } catch (error) {
            console.error('Error in guildMemberAdd event:', error);
        }
    }
};
