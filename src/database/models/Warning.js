import pool from '../database.js';

/**
 * Add a warning to a user
 */
export async function addWarning(userId, guildId, moderatorId, reason) {
    try {
        const [result] = await pool.query(
            'INSERT INTO warnings (user_id, guild_id, moderator_id, reason, timestamp) VALUES (?, ?, ?, ?, ?)',
            [userId, guildId, moderatorId, reason, Date.now()]
        );
        return result.insertId;
    } catch (error) {
        console.error('Error adding warning:', error);
        throw error;
    }
}

/**
 * Get all warnings for a user in a guild
 */
export async function getWarnings(userId, guildId) {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM warnings WHERE user_id = ? AND guild_id = ? ORDER BY timestamp DESC',
            [userId, guildId]
        );
        return rows;
    } catch (error) {
        console.error('Error getting warnings:', error);
        throw error;
    }
}

/**
 * Get warning count for a user in a guild
 */
export async function getWarningCount(userId, guildId) {
    try {
        const [rows] = await pool.query(
            'SELECT COUNT(*) as count FROM warnings WHERE user_id = ? AND guild_id = ?',
            [userId, guildId]
        );
        return rows[0].count;
    } catch (error) {
        console.error('Error getting warning count:', error);
        throw error;
    }
}

/**
 * Clear all warnings for a user in a guild
 */
export async function clearWarnings(userId, guildId) {
    try {
        const [result] = await pool.query(
            'DELETE FROM warnings WHERE user_id = ? AND guild_id = ?',
            [userId, guildId]
        );
        return result.affectedRows;
    } catch (error) {
        console.error('Error clearing warnings:', error);
        throw error;
    }
}

/**
 * Clear a specific warning by ID
 */
export async function clearWarningById(warningId) {
    try {
        const [result] = await pool.query(
            'DELETE FROM warnings WHERE id = ?',
            [warningId]
        );
        return result.affectedRows;
    } catch (error) {
        console.error('Error clearing warning:', error);
        throw error;
    }
}
