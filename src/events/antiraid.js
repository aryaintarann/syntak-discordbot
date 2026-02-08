import { Events, EmbedBuilder, PermissionsBitField } from 'discord.js';
import { Guild } from '../database/index.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';

// Track join timestamps per guild
const joinTracker = new Map();

export default {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        const guildData = await Guild.findByPk(member.guild.id);
        if (!guildData?.antiRaidEnabled) return;

        const guildId = member.guild.id;
        const now = Date.now();

        // Initialize tracker for this guild
        if (!joinTracker.has(guildId)) {
            joinTracker.set(guildId, []);
        }

        const joins = joinTracker.get(guildId);

        // Remove joins older than 10 seconds
        const recentJoins = joins.filter(timestamp => now - timestamp < 10000);
        recentJoins.push(now);
        joinTracker.set(guildId, recentJoins);

        // If more than 5 joins in 10 seconds, trigger lockdown
        if (recentJoins.length > 5) {
            logger.warn(`Raid detected in ${member.guild.name}! Initiating lockdown...`);

            try {
                // Lock all channels
                const channels = member.guild.channels.cache.filter(c => c.isTextBased());

                for (const [, channel] of channels) {
                    try {
                        await channel.permissionOverwrites.edit(member.guild.id, {
                            SendMessages: false
                        });
                    } catch (error) {
                        logger.error(`Failed to lock channel ${channel.name}:`, error);
                    }
                }

                // Log the raid attempt
                if (guildData.modLogChannelId) {
                    try {
                        const logChannel = await member.guild.channels.fetch(guildData.modLogChannelId);
                        const logEmbed = new EmbedBuilder()
                            .setColor(config.colors.error)
                            .setTitle('🚨 RAID DETECTED - SERVER LOCKED')
                            .setDescription('Server has been automatically locked due to suspicious join activity.')
                            .addFields(
                                { name: 'Joins in last 10s', value: recentJoins.length.toString() },
                                { name: 'Latest Member', value: `${member.user.tag} (${member.id})` },
                                { name: 'Action Taken', value: 'All channels locked. Use `/unlock` to restore.' }
                            )
                            .setTimestamp();

                        await logChannel.send({
                            content: '@here',
                            embeds: [logEmbed]
                        });
                    } catch (error) {
                        logger.error('Error sending raid alert:', error);
                    }
                }

                // Kick the new members who joined during raid
                for (let i = 0; i < Math.min(5, recentJoins.length); i++) {
                    try {
                        const recentMembers = member.guild.members.cache.filter(m =>
                            now - m.joinedTimestamp < 10000 && !m.user.bot
                        );

                        for (const [, m] of recentMembers) {
                            try {
                                await m.kick('Anti-raid protection');
                            } catch (error) {
                                logger.debug(`Could not kick ${m.user.tag}`);
                            }
                        }
                    } catch (error) {
                        logger.error('Error kicking raid members:', error);
                    }
                }

                // Clear the tracker after handling
                joinTracker.set(guildId, []);

            } catch (error) {
                logger.error('Error during raid protection:', error);
            }
        }
    }
};
