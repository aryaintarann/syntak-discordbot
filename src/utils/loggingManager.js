import { EmbedBuilder } from 'discord.js';
import pool from '../database/database.js';
import FeatureManager from './featureManager.js';
import { colors } from './embedBuilder.js';

/**
 * LoggingManager - Centralized logging utility for Discord bot
 * Handles sending logs to configured channels based on per-server feature settings
 */
class LoggingManager {
    /**
     * Get the log channel ID for a specific log type
     */
    static async getLogChannel(guildId, logType) {
        try {
            const config = await FeatureManager.getGuildConfig(guildId);
            const logConfig = config.features?.logging?.[logType];

            if (!logConfig?.enabled || !logConfig?.channelId) {
                return null;
            }

            return logConfig.channelId;
        } catch (error) {
            console.error('Error getting log channel:', error);
            return null;
        }
    }

    /**
     * Send a log to the appropriate channel
     */
    static async sendLog(guild, logType, embed) {
        try {
            const channelId = await this.getLogChannel(guild.id, logType);
            if (!channelId) return false;

            const channel = guild.channels.cache.get(channelId);
            if (!channel) return false;

            await channel.send({ embeds: [embed] });
            return true;
        } catch (error) {
            console.error(`Error sending ${logType} log:`, error);
            return false;
        }
    }

    /**
     * Log a moderation action
     */
    static async logModAction(guild, data) {
        const { action, target, moderator, reason, duration, caseNumber } = data;

        const actionIcons = {
            warn: '⚠️', mute: '🔇', unmute: '🔊', timeout: '⏰',
            kick: '👢', ban: '🔨', unban: '✅', purge: '🗑️', slowmode: '⏱️'
        };
        const actionColors = {
            warn: colors.warn, mute: colors.warn, unmute: colors.success,
            timeout: colors.warn, kick: colors.error, ban: colors.error,
            unban: colors.success, purge: colors.info, slowmode: colors.info
        };

        const embed = new EmbedBuilder()
            .setColor(actionColors[action] || colors.info)
            .setTitle(`${actionIcons[action] || '📌'} ${action.toUpperCase()}`)
            .addFields(
                { name: '👤 Target', value: target.tag ? `${target.tag} (${target.id})` : `${target}`, inline: true },
                { name: '👮 Moderator', value: moderator.tag, inline: true },
                { name: '📝 Reason', value: reason || 'No reason provided', inline: false }
            )
            .setTimestamp();

        if (caseNumber) {
            embed.setFooter({ text: `Case #${caseNumber}` });
        }
        if (duration) {
            embed.addFields({ name: '⏱️ Duration', value: duration, inline: true });
        }

        return this.sendLog(guild, 'modLog', embed);
    }

    /**
     * Log a message deletion
     */
    static async logMessageDelete(message) {
        if (!message.guild || message.author?.bot) return false;
        if (!message.content && message.attachments.size === 0) return false;

        const embed = new EmbedBuilder()
            .setColor(colors.messageDelete)
            .setTitle('🗑️ Message Deleted')
            .addFields(
                { name: '👤 Author', value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: '📍 Channel', value: `<#${message.channel.id}>`, inline: true },
                { name: '📝 Content', value: message.content?.substring(0, 1000) || '*[No content]*', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Message ID: ${message.id}` });

        if (message.attachments.size > 0) {
            const attachments = message.attachments.map(a => a.name).join(', ');
            embed.addFields({ name: '📎 Attachments', value: attachments.substring(0, 1000), inline: false });
        }

        return this.sendLog(message.guild, 'messageLog', embed);
    }

    /**
     * Log a message edit
     */
    static async logMessageEdit(oldMessage, newMessage) {
        if (!newMessage.guild || newMessage.author?.bot) return false;
        if (oldMessage.content === newMessage.content) return false;
        if (!oldMessage.content) return false;

        const embed = new EmbedBuilder()
            .setColor(colors.messageEdit)
            .setTitle('✏️ Message Edited')
            .addFields(
                { name: '👤 Author', value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
                { name: '📍 Channel', value: `<#${newMessage.channel.id}>`, inline: true },
                { name: '📝 Before', value: oldMessage.content?.substring(0, 500) || '*[No content]*', inline: false },
                { name: '📝 After', value: newMessage.content?.substring(0, 500) || '*[No content]*', inline: false },
                { name: '🔗 Jump', value: `[Click here](${newMessage.url})`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Message ID: ${newMessage.id}` });

        return this.sendLog(newMessage.guild, 'messageLog', embed);
    }

    /**
     * Log member join
     */
    static async logMemberJoin(member) {
        const accountAge = Date.now() - member.user.createdTimestamp;
        const days = Math.floor(accountAge / (1000 * 60 * 60 * 24));

        let ageWarning = '';
        if (days < 7) ageWarning = ' ⚠️ New Account!';
        else if (days < 30) ageWarning = ' ⚡ Young Account';

        const embed = new EmbedBuilder()
            .setColor(colors.success)
            .setTitle('📥 Member Joined')
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: '👤 User', value: `${member.user.tag} (${member.id})`, inline: true },
                { name: '📅 Account Age', value: `${days} days${ageWarning}`, inline: true },
                { name: '📊 Member Count', value: `${member.guild.memberCount}`, inline: true },
                { name: '📆 Created At', value: member.user.createdAt.toLocaleDateString('id-ID'), inline: true }
            )
            .setTimestamp();

        return this.sendLog(member.guild, 'joinLeaveLog', embed);
    }

    /**
     * Log member leave
     */
    static async logMemberLeave(member) {
        const joinedAt = member.joinedAt;
        const memberFor = joinedAt ? Math.floor((Date.now() - joinedAt.getTime()) / (1000 * 60 * 60 * 24)) : 'Unknown';

        const roles = member.roles.cache
            .filter(r => r.id !== member.guild.id)
            .map(r => r.name)
            .slice(0, 10)
            .join(', ') || 'None';

        const embed = new EmbedBuilder()
            .setColor(colors.error)
            .setTitle('📤 Member Left')
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: '👤 User', value: `${member.user.tag} (${member.id})`, inline: true },
                { name: '📅 Member For', value: `${memberFor} days`, inline: true },
                { name: '📊 Member Count', value: `${member.guild.memberCount}`, inline: true },
                { name: '🎭 Roles', value: roles.substring(0, 1000), inline: false }
            )
            .setTimestamp();

        return this.sendLog(member.guild, 'joinLeaveLog', embed);
    }

    /**
     * Log voice state changes
     */
    static async logVoiceUpdate(oldState, newState) {
        const member = newState.member || oldState.member;
        if (!member || member.user.bot) return false;

        let title, description, color;

        if (!oldState.channel && newState.channel) {
            // Joined voice
            title = '🎤 Voice Joined';
            description = `${member} joined **${newState.channel.name}**`;
            color = colors.success;
        } else if (oldState.channel && !newState.channel) {
            // Left voice
            title = '🎤 Voice Left';
            description = `${member} left **${oldState.channel.name}**`;
            color = colors.error;
        } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
            // Moved channels
            title = '🎤 Voice Moved';
            description = `${member} moved from **${oldState.channel.name}** to **${newState.channel.name}**`;
            color = colors.info;
        } else {
            // Other state changes (mute, deaf, etc) - skip
            return false;
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: `User ID: ${member.id}` });

        return this.sendLog(member.guild, 'voiceLog', embed);
    }

    /**
     * Log role changes
     */
    static async logRoleUpdate(oldMember, newMember) {
        const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
        const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

        if (addedRoles.size === 0 && removedRoles.size === 0) return false;

        const embed = new EmbedBuilder()
            .setColor(colors.info)
            .setTitle('🎭 Role Updated')
            .addFields(
                { name: '👤 User', value: `${newMember.user.tag} (${newMember.id})`, inline: true }
            )
            .setTimestamp();

        if (addedRoles.size > 0) {
            embed.addFields({
                name: '➕ Added',
                value: addedRoles.map(r => r.name).join(', ').substring(0, 1000),
                inline: true
            });
        }
        if (removedRoles.size > 0) {
            embed.addFields({
                name: '➖ Removed',
                value: removedRoles.map(r => r.name).join(', ').substring(0, 1000),
                inline: true
            });
        }

        return this.sendLog(newMember.guild, 'roleLog', embed);
    }
}

export default LoggingManager;
