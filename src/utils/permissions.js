import { PermissionFlagsBits } from 'discord.js';

// Permission mappings
export const permissions = {
    KICK: PermissionFlagsBits.KickMembers,
    BAN: PermissionFlagsBits.BanMembers,
    TIMEOUT: PermissionFlagsBits.ModerateMembers,
    MANAGE_MESSAGES: PermissionFlagsBits.ManageMessages,
    MANAGE_CHANNELS: PermissionFlagsBits.ManageChannels,
    ADMINISTRATOR: PermissionFlagsBits.Administrator,
    VIEW_AUDIT_LOG: PermissionFlagsBits.ViewAuditLog,
};

// Command permission requirements
export const commandPermissions = {
    kick: permissions.KICK,
    ban: permissions.BAN,
    softban: permissions.BAN,
    timeout: permissions.TIMEOUT,
    warn: permissions.ModerateMembers,
    warnings: permissions.ModerateMembers,
    clearwarns: permissions.ADMINISTRATOR,
    lockdown: permissions.ADMINISTRATOR,
    unlockdown: permissions.ADMINISTRATOR,
    purge: permissions.MANAGE_MESSAGES,
};

/**
 * Check if user has required permission
 */
export function hasPermission(member, permission) {
    return member.permissions.has(permission);
}

/**
 * Check if user is moderator (has any mod permission)
 */
export function isModerator(member) {
    return member.permissions.has([
        permissions.KICK,
        permissions.BAN,
        permissions.TIMEOUT,
        permissions.MANAGE_MESSAGES
    ], false); // false = needs ANY of these permissions
}

/**
 * Check if user is admin
 */
export function isAdmin(member) {
    return member.permissions.has(permissions.ADMINISTRATOR);
}

/**
 * Check if moderator can moderate target (role hierarchy)
 */
export function canModerate(moderator, target) {
    // Bot owner can always moderate
    if (moderator.guild.ownerId === moderator.id) return true;

    // Cannot moderate guild owner
    if (target.guild.ownerId === target.id) return false;

    // Cannot moderate yourself
    if (moderator.id === target.id) return false;

    // Check role hierarchy
    return moderator.roles.highest.position > target.roles.highest.position;
}

/**
 * Check if member has exempt role for auto-mod
 */
export function hasExemptRole(member, exemptRoles) {
    if (!exemptRoles || exemptRoles.length === 0) return false;

    return member.roles.cache.some(role =>
        exemptRoles.includes(role.name) || exemptRoles.includes(role.id)
    );
}
