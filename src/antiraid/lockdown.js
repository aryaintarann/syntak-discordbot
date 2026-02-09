import { PermissionFlagsBits } from 'discord.js';
import { lockdownConfig } from '../config/antiraid.js';

// Store original permissions for restore
const originalPermissions = new Map();

/**
 * Enable lockdown mode
 */
export async function enableLockdown(guild, options = {}) {
    try {
        const {
            channels = null, // null = all channels
            reason = 'Server lockdown activated',
            moderator = null
        } = options;

        const channelsToLock = channels || guild.channels.cache.filter(
            ch => ch.type === 0 && !isExemptChannel(ch) // 0 = GUILD_TEXT
        );

        const lockdownResults = {
            success: [],
            failed: []
        };

        for (const [channelId, channel] of channelsToLock) {
            try {
                // Get @everyone role
                const everyoneRole = guild.roles.everyone;

                // Store original permissions
                const permissions = channel.permissionOverwrites.cache.get(everyoneRole.id);
                if (permissions) {
                    originalPermissions.set(channelId, {
                        allow: permissions.allow.bitfield,
                        deny: permissions.deny.bitfield
                    });
                }

                // Lock channel - remove send message permissions
                await channel.permissionOverwrites.edit(everyoneRole, {
                    SendMessages: false,
                    AddReactions: false,
                    CreatePublicThreads: false,
                    CreatePrivateThreads: false,
                    SendMessagesInThreads: false
                }, { reason });

                lockdownResults.success.push(channel.name);
            } catch (error) {
                console.error(`Failed to lock ${channel.name}:`, error);
                lockdownResults.failed.push(channel.name);
            }
        }

        // Send lockdown message to general/announcement channel
        await sendLockdownNotification(guild, true, moderator, reason);

        return lockdownResults;
    } catch (error) {
        console.error('Error enabling lockdown:', error);
        throw error;
    }
}

/**
 * Disable lockdown mode
 */
export async function disableLockdown(guild, options = {}) {
    try {
        const {
            channels = null,
            reason = 'Lockdown lifted',
            moderator = null
        } = options;

        const channelsToUnlock = channels || guild.channels.cache.filter(
            ch => ch.type === 0 && !isExemptChannel(ch)
        );

        const unlockResults = {
            success: [],
            failed: []
        };

        for (const [channelId, channel] of channelsToUnlock) {
            try {
                const everyoneRole = guild.roles.everyone;

                // Restore original permissions if available
                const original = originalPermissions.get(channelId);

                if (original) {
                    // Restore exactly as before
                    await channel.permissionOverwrites.edit(everyoneRole, {
                        allow: BigInt(original.allow),
                        deny: BigInt(original.deny)
                    }, { reason });

                    originalPermissions.delete(channelId);
                } else {
                    // No stored permissions - delete the override to restore defaults
                    const existingOverride = channel.permissionOverwrites.cache.get(everyoneRole.id);
                    if (existingOverride) {
                        await existingOverride.delete(reason);
                    }
                }

                unlockResults.success.push(channel.name);
            } catch (error) {
                console.error(`Failed to unlock ${channel.name}:`, error);
                unlockResults.failed.push(channel.name);
            }
        }

        // Send unlock notification
        await sendLockdownNotification(guild, false, moderator, reason);

        return unlockResults;
    } catch (error) {
        console.error('Error disabling lockdown:', error);
        throw error;
    }
}

/**
 * Check if channel is exempt from lockdown
 */
function isExemptChannel(channel) {
    return lockdownConfig.exemptChannels.some(exempt =>
        channel.name.includes(exempt) || channel.id === exempt
    );
}

/**
 * Send lockdown notification to server
 */
async function sendLockdownNotification(guild, isLockdown, moderator, reason) {
    try {
        // Find general/announcement channel
        const channel = guild.channels.cache.find(
            ch => ch.name.includes('general') ||
                ch.name.includes('announcement') ||
                ch.name.includes('chat')
        );

        if (!channel) return;

        const message = isLockdown
            ? `🔒 **SERVER LOCKDOWN**\n${lockdownConfig.lockdownMessage}\n\n**Moderator:** ${moderator ? moderator.tag : 'Auto (System)'}\n**Reason:** ${reason}`
            : `🔓 **LOCKDOWN LIFTED**\nServer telah kembali normal. Anda dapat mengirim pesan kembali.\n\n**Moderator:** ${moderator ? moderator.tag : 'Auto (System)'}\n**Reason:** ${reason}`;

        await channel.send(message);
    } catch (error) {
        console.error('Error sending lockdown notification:', error);
    }
}

/**
 * Check if server is currently locked down
 */
export function isLocked(guild) {
    return originalPermissions.size > 0;
}

/**
 * Lock specific channel
 */
export async function lockChannel(channel, reason = 'Channel locked') {
    try {
        const everyoneRole = channel.guild.roles.everyone;

        // Store original permissions
        const permissions = channel.permissionOverwrites.cache.get(everyoneRole.id);
        if (permissions) {
            originalPermissions.set(channel.id, {
                allow: permissions.allow.bitfield,
                deny: permissions.deny.bitfield
            });
        }

        await channel.permissionOverwrites.edit(everyoneRole, {
            SendMessages: false,
            AddReactions: false
        }, { reason });

        return true;
    } catch (error) {
        console.error('Error locking channel:', error);
        return false;
    }
}

/**
 * Unlock specific channel
 */
export async function unlockChannel(channel, reason = 'Channel unlocked') {
    try {
        console.log(`[Unlockdown] Starting unlock for channel: ${channel.name} (${channel.id})`);

        const everyoneRole = channel.guild.roles.everyone;
        console.log(`[Unlockdown] @everyone role ID: ${everyoneRole.id}`);

        const original = originalPermissions.get(channel.id);
        console.log(`[Unlockdown] Original permissions stored: ${original ? 'YES' : 'NO'}`);

        // Check current permissions
        const currentOverride = channel.permissionOverwrites.cache.get(everyoneRole.id);
        console.log(`[Unlockdown] Current override exists: ${currentOverride ? 'YES' : 'NO'}`);
        if (currentOverride) {
            console.log(`[Unlockdown] Current permissions - Allow: ${currentOverride.allow.bitfield}, Deny: ${currentOverride.deny.bitfield}`);
        }

        if (original) {
            // Restore exact original permissions
            console.log(`[Unlockdown] Restoring original permissions - Allow: ${original.allow}, Deny: ${original.deny}`);
            await channel.permissionOverwrites.edit(everyoneRole, {
                allow: BigInt(original.allow),
                deny: BigInt(original.deny)
            }, { reason });

            originalPermissions.delete(channel.id);
            console.log(`[Unlockdown] ✅ Restored original permissions`);
        } else {
            // No stored permissions - delete the override entirely to restore defaults
            const existingOverride = channel.permissionOverwrites.cache.get(everyoneRole.id);
            if (existingOverride) {
                console.log(`[Unlockdown] Deleting permission override for @everyone...`);
                await existingOverride.delete(reason);
                console.log(`[Unlockdown] ✅ Deleted permission override`);
            } else {
                console.log(`[Unlockdown] ⚠️ No override to delete - channel should already be unlocked`);
            }
        }

        // Verify after unlock
        const afterOverride = channel.permissionOverwrites.cache.get(everyoneRole.id);
        console.log(`[Unlockdown] After unlock - Override exists: ${afterOverride ? 'YES' : 'NO'}`);
        if (afterOverride) {
            console.log(`[Unlockdown] ⚠️ WARNING: Override still exists! Allow: ${afterOverride.allow.bitfield}, Deny: ${afterOverride.deny.bitfield}`);
        }

        return true;
    } catch (error) {
        console.error('[Unlockdown] ❌ Error unlocking channel:', error);
        console.error('[Unlockdown] Error details:', error.message, error.stack);
        return false;
    }
}
