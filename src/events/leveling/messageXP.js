import { Events } from 'discord.js';
import { User, Guild } from '../../database/index.js';
import config from '../../config/config.js';
import logger from '../../utils/logger.js';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        // Check if leveling is enabled
        const guildData = await Guild.findByPk(message.guild.id);
        if (!guildData || !guildData.levelingEnabled) return;

        // Get or create user
        let userData = await User.findOne({
            where: { userId: message.author.id, guildId: message.guild.id }
        });

        if (!userData) {
            userData = await User.create({
                userId: message.author.id,
                guildId: message.guild.id
            });
        }

        // Check XP cooldown
        const now = new Date();
        const lastXp = userData.lastXpGain ? new Date(userData.lastXpGain) : null;

        if (lastXp) {
            const timeDiff = (now - lastXp) / 1000; // seconds
            if (timeDiff < config.leveling.xpMessageCooldown) {
                return; // Still on cooldown
            }
        }

        // Give XP
        const xpGain = config.leveling.xpPerMessage + Math.floor(Math.random() * 10); // Random bonus
        const oldLevel = userData.level;

        userData.lastXpGain = now;
        const result = await userData.addXp(xpGain);

        // Check if leveled up
        if (result.leveledUp) {
            logger.info(`${message.author.tag} leveled up to ${result.newLevel} in ${message.guild.name}`);

            // Send level up message
            let levelUpChannel = message.channel;
            if (guildData.levelUpChannelId) {
                try {
                    levelUpChannel = await message.guild.channels.fetch(guildData.levelUpChannelId);
                } catch (error) {
                    logger.debug('Level up channel not found, using current channel');
                }
            }

            const levelUpMsg = guildData.levelUpMessage
                .replace('{user}', message.author.toString())
                .replace('{level}', result.newLevel);

            try {
                await levelUpChannel.send(levelUpMsg);
            } catch (error) {
                logger.error('Error sending level up message:', error);
            }

            // Check for role rewards
            const levelRoles = guildData.levelRoles || {};
            const roleId = levelRoles[result.newLevel.toString()];

            if (roleId) {
                try {
                    const role = await message.guild.roles.fetch(roleId);
                    if (role && message.member) {
                        await message.member.roles.add(role);
                        await message.channel.send(`🎉 ${message.author}, you earned the **${role.name}** role!`);
                    }
                } catch (error) {
                    logger.error('Error assigning level role reward:', error);
                }
            }
        }
    }
};
