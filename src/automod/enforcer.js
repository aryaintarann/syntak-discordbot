import { autoModConfig, warningMessages } from '../config/automod.js';
import { hasExemptRole } from '../utils/permissions.js';
import { createAutoModEmbed } from '../utils/embedBuilder.js';
import { logModAction } from '../database/models/ModLog.js';
import { addWarning, getWarningCount } from '../database/models/Warning.js';
import { parseTime } from '../utils/timeParser.js';
import pool from '../database/database.js';

/**
 * Enforce auto-moderation violations
 */
export async function enforceViolation(message, violation, config) {
    try {
        // Check if user has exempt role
        if (hasExemptRole(message.member, config.exemptRoles || [])) {
            return;
        }

        // Delete the message
        if (config.action === 'delete' || config.action === 'warn' || config.action === 'timeout') {
            try {
                await message.delete();
            } catch (error) {
                console.error('Failed to delete message:', error);
            }
        }

        // Log violation to database
        await logViolation(message, violation);

        // Send warning to user
        if (config.sendWarning) {
            await sendUserWarning(message, violation);
        }

        // Log to mod channel
        await logToModChannel(message, violation);

        // Auto-warn if configured
        if (config.autoWarn) {
            await handleAutoWarn(message, violation);
        }

        // Timeout if configured
        if (config.action === 'timeout') {
            await handleAutoTimeout(message, violation);
        }

    } catch (error) {
        console.error('Error enforcing violation:', error);
    }
}

/**
 * Log violation to database
 */
async function logViolation(message, violation) {
    try {
        await pool.query(
            'INSERT INTO automod_violations (user_id, guild_id, violation_type, content, timestamp) VALUES (?, ?, ?, ?, ?)',
            [message.author.id, message.guild.id, violation.type, message.content, Date.now()]
        );
    } catch (error) {
        console.error('Error logging violation:', error);
    }
}

/**
 * Send warning message to user via DM
 */
async function sendUserWarning(message, violation) {
    try {
        const warningMsg = warningMessages[violation.type] || '⚠️ Pesan Anda dihapus karena melanggar aturan server.';

        await message.author.send({
            content: `${warningMsg}\n\n**Server:** ${message.guild.name}\n**Alasan:** ${violation.details}`
        }).catch(() => {
            // User has DMs disabled, send in channel instead (ephemeral would be better but we're in messageCreate)
            // We'll send a temporary message
            message.channel.send(`${message.author}, ${warningMsg}`).then(msg => {
                setTimeout(() => msg.delete().catch(() => { }), 5000);
            }).catch(() => { });
        });
    } catch (error) {
        console.error('Error sending user warning:', error);
    }
}

/**
 * Log to mod channel
 */
async function logToModChannel(message, violation) {
    try {
        // Get mod log channel from database
        const [rows] = await pool.query(
            'SELECT mod_log_channel FROM guild_config WHERE guild_id = ?',
            [message.guild.id]
        );

        if (!rows || rows.length === 0 || !rows[0].mod_log_channel) {
            return;
        }

        const channel = message.guild.channels.cache.get(rows[0].mod_log_channel);
        if (!channel) return;

        const embed = createAutoModEmbed(
            violation.type,
            message.author,
            message.content
        );

        embed.addFields(
            { name: '📍 Channel', value: `${message.channel}`, inline: true },
            { name: '⚠️ Details', value: violation.details, inline: true }
        );

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error logging to mod channel:', error);
    }
}

/**
 * Handle auto-warn
 */
async function handleAutoWarn(message, violation) {
    try {
        // Add warning to database
        await addWarning(
            message.author.id,
            message.guild.id,
            message.client.user.id, // Bot sebagai moderator
            `Auto-moderation: ${violation.type}`
        );

        const warningCount = await getWarningCount(message.author.id, message.guild.id);

        // Check if user reached warning threshold
        const [configRows] = await pool.query(
            'SELECT max_warnings, auto_action FROM guild_config WHERE guild_id = ?',
            [message.guild.id]
        );

        if (configRows && configRows.length > 0) {
            const { max_warnings, auto_action } = configRows[0];

            if (warningCount >= max_warnings) {
                // Execute auto action
                if (auto_action === 'timeout') {
                    await message.member.timeout(600000, `Reached ${max_warnings} warnings`); // 10 min timeout
                } else if (auto_action === 'kick') {
                    await message.member.kick(`Reached ${max_warnings} warnings`);
                }

                // Log action
                await logModAction(
                    auto_action,
                    message.author.id,
                    message.author.tag,
                    message.client.user.id,
                    message.client.user.tag,
                    message.guild.id,
                    `Auto-action: Reached ${max_warnings} warnings`
                );
            }
        }
    } catch (error) {
        console.error('Error handling auto-warn:', error);
    }
}

/**
 * Handle auto-timeout
 */
async function handleAutoTimeout(message, violation) {
    try {
        const timeoutDuration = 300000; // 5 minutes default

        await message.member.timeout(
            timeoutDuration,
            `Auto-moderation: ${violation.type}`
        );

        // Log action
        await logModAction(
            'timeout',
            message.author.id,
            message.author.tag,
            message.client.user.id,
            message.client.user.tag,
            message.guild.id,
            `Auto-moderation: ${violation.type}`,
            { duration: timeoutDuration }
        );
    } catch (error) {
        console.error('Error handling auto-timeout:', error);
    }
}

/**
 * Check spam (rapid messages)
 */
const userMessageTimestamps = new Map();

export function checkSpam(userId, threshold = 5, timeWindow = 5000) {
    const now = Date.now();

    if (!userMessageTimestamps.has(userId)) {
        userMessageTimestamps.set(userId, []);
    }

    const timestamps = userMessageTimestamps.get(userId);

    // Remove old timestamps outside time window
    const recentTimestamps = timestamps.filter(ts => now - ts < timeWindow);

    // Add current timestamp
    recentTimestamps.push(now);
    userMessageTimestamps.set(userId, recentTimestamps);

    // Check if threshold exceeded
    if (recentTimestamps.length > threshold) {
        return {
            isSpam: true,
            messageCount: recentTimestamps.length
        };
    }

    return { isSpam: false };
}

// Clean up old entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [userId, timestamps] of userMessageTimestamps.entries()) {
        const recentTimestamps = timestamps.filter(ts => now - ts < 60000); // Keep last minute
        if (recentTimestamps.length === 0) {
            userMessageTimestamps.delete(userId);
        } else {
            userMessageTimestamps.set(userId, recentTimestamps);
        }
    }
}, 600000);
