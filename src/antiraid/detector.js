import pool from '../database/database.js';
import { antiRaidConfig, getRaidSeverity } from '../config/antiraid.js';

/**
 * Track new member join
 */
export async function trackMemberJoin(guildId, userId) {
    try {
        await pool.query(
            'INSERT INTO join_tracker (user_id, guild_id, join_time) VALUES (?, ?, ?)',
            [userId, guildId, Date.now()]
        );
    } catch (error) {
        console.error('Error tracking member join:', error);
    }
}

/**
 * Get recent joins count within time window
 */
export async function getRecentJoinsCount(guildId, timeWindow = antiRaidConfig.timeWindow) {
    try {
        const cutoffTime = Date.now() - timeWindow;

        const [rows] = await pool.query(
            'SELECT COUNT(*) as count FROM join_tracker WHERE guild_id = ? AND join_time > ?',
            [guildId, cutoffTime]
        );

        return rows[0].count;
    } catch (error) {
        console.error('Error getting recent joins count:', error);
        return 0;
    }
}

/**
 * Get recent joins with details
 */
export async function getRecentJoins(guildId, timeWindow = antiRaidConfig.timeWindow) {
    try {
        const cutoffTime = Date.now() - timeWindow;

        const [rows] = await pool.query(
            'SELECT * FROM join_tracker WHERE guild_id = ? AND join_time > ? ORDER BY join_time DESC',
            [guildId, cutoffTime]
        );

        return rows;
    } catch (error) {
        console.error('Error getting recent joins:', error);
        return [];
    }
}

/**
 * Detect if raid is happening
 */
export async function detectRaid(guildId) {
    try {
        const joinCount = await getRecentJoinsCount(
            guildId,
            antiRaidConfig.timeWindow
        );

        const severity = getRaidSeverity(joinCount);

        if (joinCount >= antiRaidConfig.joinThreshold) {
            return {
                isRaid: true,
                joinCount,
                severity,
                timeWindow: antiRaidConfig.timeWindow
            };
        }

        return {
            isRaid: false,
            joinCount,
            severity: 'NONE'
        };
    } catch (error) {
        console.error('Error detecting raid:', error);
        return { isRaid: false };
    }
}

/**
 * Check if account is suspicious (new account)
 */
export function isSuspiciousAccount(member) {
    const accountAge = Date.now() - member.user.createdTimestamp;
    return accountAge < antiRaidConfig.minAccountAge;
}

/**
 * Get suspicious members from recent joins
 */
export async function getSuspiciousMembers(guild, timeWindow = antiRaidConfig.timeWindow) {
    try {
        const recentJoins = await getRecentJoins(guild.id, timeWindow);
        const suspiciousMembers = [];

        for (const join of recentJoins) {
            const member = await guild.members.fetch(join.user_id).catch(() => null);
            if (member && isSuspiciousAccount(member)) {
                suspiciousMembers.push(member);
            }
        }

        return suspiciousMembers;
    } catch (error) {
        console.error('Error getting suspicious members:', error);
        return [];
    }
}

/**
 * Clean old join entries (called periodically)
 */
export async function cleanOldJoinEntries(maxAge = 3600000) { // 1 hour default
    try {
        const cutoffTime = Date.now() - maxAge;

        await pool.query(
            'DELETE FROM join_tracker WHERE join_time < ?',
            [cutoffTime]
        );
    } catch (error) {
        console.error('Error cleaning old join entries:', error);
    }
}
