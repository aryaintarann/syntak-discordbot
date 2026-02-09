import { EmbedBuilder } from 'discord.js';

// Color scheme untuk berbagai action types
export const colors = {
    // Moderation actions
    kick: 0xFF6B35,      // Orange
    ban: 0xFF0000,       // Red
    softban: 0xFF6B35,   // Orange
    timeout: 0xFFA500,   // Yellow-orange
    warn: 0xFFFF00,      // Yellow
    unwarn: 0x00FF00,    // Green

    // Auto-mod
    automod: 0x9B59B6,   // Purple

    // Raid
    raid: 0xFF0000,      // Red
    lockdown: 0xFF0000,  // Red

    // Logs
    messageDelete: 0xE74C3C,  // Dark red
    messageEdit: 0x3498DB,    // Blue

    // Success/Info
    success: 0x00FF00,   // Green
    info: 0x3498DB,      // Blue
    error: 0xFF0000,     // Red
};

/**
 * Create embed untuk mod action log
 */
export function createModActionEmbed(action, target, moderator, reason, additionalFields = []) {
    const embed = new EmbedBuilder()
        .setColor(colors[action.toLowerCase()] || colors.info)
        .setTitle(`🔨 ${action.toUpperCase()}`)
        .addFields(
            { name: '👤 Target', value: `${target.tag} (${target.id})`, inline: true },
            { name: '👮 Moderator', value: `${moderator.tag}`, inline: true },
            { name: '📝 Reason', value: reason || 'Tidak ada alasan', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `User ID: ${target.id}` });

    // Add additional fields
    if (additionalFields.length > 0) {
        embed.addFields(additionalFields);
    }

    return embed;
}

/**
 * Create embed untuk message delete log
 */
export function createMessageDeleteEmbed(message) {
    const embed = new EmbedBuilder()
        .setColor(colors.messageDelete)
        .setTitle('🗑️ Message Deleted')
        .addFields(
            { name: '👤 Author', value: `${message.author.tag} (${message.author.id})`, inline: true },
            { name: '📍 Channel', value: `${message.channel.name}`, inline: true },
            { name: '📝 Content', value: message.content || '*[No content / Embed/Attachment only]*' }
        )
        .setTimestamp()
        .setFooter({ text: `Message ID: ${message.id}` });

    // Add attachment info if any
    if (message.attachments.size > 0) {
        const attachments = message.attachments.map(a => a.name).join(', ');
        embed.addFields({ name: '📎 Attachments', value: attachments });
    }

    return embed;
}

/**
 * Create embed untuk message edit log
 */
export function createMessageEditEmbed(oldMessage, newMessage) {
    const embed = new EmbedBuilder()
        .setColor(colors.messageEdit)
        .setTitle('✏️ Message Edited')
        .addFields(
            { name: '👤 Author', value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
            { name: '📍 Channel', value: `${newMessage.channel.name}`, inline: true },
            { name: '📝 Old Content', value: oldMessage.content || '*[No content]*' },
            { name: '📝 New Content', value: newMessage.content || '*[No content]*' },
            { name: '🔗 Jump to Message', value: `[Click here](${newMessage.url})` }
        )
        .setTimestamp()
        .setFooter({ text: `Message ID: ${newMessage.id}` });

    return embed;
}

/**
 * Create embed untuk warning
 */
export function createWarningEmbed(user, moderator, reason, warningCount) {
    const embed = new EmbedBuilder()
        .setColor(colors.warn)
        .setTitle('⚠️ Warning Issued')
        .addFields(
            { name: '👤 User', value: `${user.tag} (${user.id})`, inline: true },
            { name: '👮 Moderator', value: `${moderator.tag}`, inline: true },
            { name: '📝 Reason', value: reason },
            { name: '🔢 Total Warnings', value: `${warningCount}`, inline: true }
        )
        .setTimestamp();

    return embed;
}

/**
 * Create embed untuk raid alert
 */
export function createRaidAlertEmbed(joinCount, timeWindow, severity) {
    const embed = new EmbedBuilder()
        .setColor(colors.raid)
        .setTitle('🚨 RAID DETECTED!')
        .setDescription(`**Severity: ${severity}**`)
        .addFields(
            { name: '👥 Join Count', value: `${joinCount} users`, inline: true },
            { name: '⏱️ Time Window', value: `${timeWindow / 1000} seconds`, inline: true },
            { name: '🔒 Action', value: 'Server lockdown activated', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Anti-Raid System' });

    return embed;
}

/**
 * Create embed untuk lockdown notification
 */
export function createLockdownEmbed(enabled, moderator, reason) {
    const embed = new EmbedBuilder()
        .setColor(enabled ? colors.lockdown : colors.success)
        .setTitle(enabled ? '🔒 Server Locked Down' : '🔓 Lockdown Lifted')
        .addFields(
            { name: '👮 Moderator', value: moderator ? moderator.tag : 'System (Auto)', inline: true },
            { name: '📝 Reason', value: reason || 'No reason provided', inline: false }
        )
        .setTimestamp();

    if (enabled) {
        embed.setDescription('Server sedang dalam mode lockdown. Member tidak dapat mengirim pesan.');
    } else {
        embed.setDescription('Lockdown telah dicabut. Member dapat mengirim pesan kembali.');
    }

    return embed;
}

/**
 * Create embed untuk auto-mod violation
 */
export function createAutoModEmbed(violationType, user, content) {
    const embed = new EmbedBuilder()
        .setColor(colors.automod)
        .setTitle('🤖 Auto-Moderation')
        .addFields(
            { name: '👤 User', value: `${user.tag} (${user.id})`, inline: true },
            { name: '⚠️ Violation', value: violationType, inline: true },
            { name: '📝 Content', value: content.substring(0, 1000) || '*[No content]*' }
        )
        .setTimestamp();

    return embed;
}

/**
 * Create simple success embed
 */
export function createSuccessEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(colors.success)
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Create simple error embed
 */
export function createErrorEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(colors.error)
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Create info embed
 */
export function createInfoEmbed(title, description, fields = []) {
    const embed = new EmbedBuilder()
        .setColor(colors.info)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();

    if (fields.length > 0) {
        embed.addFields(fields);
    }

    return embed;
}
