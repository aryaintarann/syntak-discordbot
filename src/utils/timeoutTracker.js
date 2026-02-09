import pool from '../database/database.js';

/**
 * Track timeout yang sedang aktif
 */
export async function trackTimeout(userId, guildId, expiryTime) {
    try {
        const result = await pool.query(
            `INSERT INTO active_timeouts (user_id, guild_id, expiry_time, created_at, notified)
             VALUES (?, ?, ?, ?, 0)
             ON DUPLICATE KEY UPDATE 
                expiry_time = VALUES(expiry_time),
                created_at = VALUES(created_at),
                notified = 0`,
            [userId, guildId, expiryTime, Date.now()]
        );

        console.log(`[Timeout Tracker] ✅ Tracked timeout for user ${userId} expiring at ${new Date(expiryTime)}`);
    } catch (error) {
        console.error('[Timeout Tracker] ❌ Error tracking timeout:', error);
    }
}

/**
 * Get all timeouts yang sudah expired
 */
export async function getExpiredTimeouts() {
    try {
        const now = Date.now();

        const [rows] = await pool.query(
            'SELECT * FROM active_timeouts WHERE expiry_time <= ? AND notified = 0',
            [now]
        );

        if (rows.length > 0) {
            console.log(`[Timeout Tracker] Found ${rows.length} expired timeout(s) to process`);
        }

        return rows;
    } catch (error) {
        console.error('[Timeout Tracker] Error getting expired timeouts:', error);
        return [];
    }
}

/**
 * Mark timeout sebagai sudah notified
 */
export async function markTimeoutNotified(userId, guildId) {
    try {
        await pool.query(
            'UPDATE active_timeouts SET notified = 1 WHERE user_id = ? AND guild_id = ?',
            [userId, guildId]
        );
    } catch (error) {
        console.error('Error marking timeout as notified:', error);
    }
}

/**
 * Cleanup old timeout records (> 30 days)
 */
export async function cleanupOldTimeouts() {
    try {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        await pool.query(
            'DELETE FROM active_timeouts WHERE expiry_time < ?',
            [thirtyDaysAgo]
        );
    } catch (error) {
        console.error('Error cleaning up old timeouts:', error);
    }
}
