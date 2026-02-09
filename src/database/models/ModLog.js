import pool from '../database.js';

/**
 * Log a moderation action
 */
export async function logModAction(actionType, targetId, targetTag, moderatorId, moderatorTag, guildId, reason, additionalData = null) {
    try {
        const [result] = await pool.query(
            'INSERT INTO mod_logs (action_type, target_id, target_tag, moderator_id, moderator_tag, guild_id, reason, timestamp, additional_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                actionType,
                targetId,
                targetTag,
                moderatorId,
                moderatorTag,
                guildId,
                reason,
                Date.now(),
                additionalData ? JSON.stringify(additionalData) : null
            ]
        );
        return result.insertId;
    } catch (error) {
        console.error('Error logging mod action:', error);
        throw error;
    }
}

/**
 * Get mod logs for a user
 */
export async function getModLogs(targetId, guildId, limit = 10) {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM mod_logs WHERE target_id = ? AND guild_id = ? ORDER BY timestamp DESC LIMIT ?',
            [targetId, guildId, limit]
        );
        return rows;
    } catch (error) {
        console.error('Error getting mod logs:', error);
        throw error;
    }
}

/**
 * Get recent mod logs for a guild
 */
export async function getRecentModLogs(guildId, limit = 50) {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM mod_logs WHERE guild_id = ? ORDER BY timestamp DESC LIMIT ?',
            [guildId, limit]
        );
        return rows;
    } catch (error) {
        console.error('Error getting recent mod logs:', error);
        throw error;
    }
}
