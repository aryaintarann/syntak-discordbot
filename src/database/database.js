import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'syntak_discord_bot',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

/**
 * Initialize database tables
 */
export async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();

        // Create warnings table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS warnings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(20) NOT NULL,
                guild_id VARCHAR(20) NOT NULL,
                moderator_id VARCHAR(20) NOT NULL,
                reason TEXT NOT NULL,
                timestamp BIGINT NOT NULL,
                INDEX idx_user_guild (user_id, guild_id)
            )
        `);

        // Create mod_logs table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS mod_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                action_type VARCHAR(50) NOT NULL,
                target_id VARCHAR(20) NOT NULL,
                target_tag VARCHAR(100),
                moderator_id VARCHAR(20) NOT NULL,
                moderator_tag VARCHAR(100),
                guild_id VARCHAR(20) NOT NULL,
                reason TEXT,
                timestamp BIGINT NOT NULL,
                additional_data JSON,
                INDEX idx_guild_time (guild_id, timestamp),
                INDEX idx_target (target_id)
            )
        `);

        // Create guild_config table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS guild_config (
                guild_id VARCHAR(20) PRIMARY KEY,
                mod_log_channel VARCHAR(20),
                auto_mod_enabled BOOLEAN DEFAULT true,
                raid_protection_enabled BOOLEAN DEFAULT true,
                max_warnings INT DEFAULT 3,
                auto_action VARCHAR(20) DEFAULT 'timeout',
                config_data JSON
            )
        `);

        // Create join_tracker table for anti-raid
        await connection.query(`
            CREATE TABLE IF NOT EXISTS join_tracker (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(20) NOT NULL,
                guild_id VARCHAR(20) NOT NULL,
                join_time BIGINT NOT NULL,
                INDEX idx_guild_time (guild_id, join_time)
            )
        `);

        // Create automod_violations table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS automod_violations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(20) NOT NULL,
                guild_id VARCHAR(20) NOT NULL,
                violation_type VARCHAR(50) NOT NULL,
                content TEXT,
                timestamp BIGINT NOT NULL,
                INDEX idx_user_guild (user_id, guild_id)
            )
        `);

        // Create active_timeouts table for tracking timeout expiry
        await connection.query(`
            CREATE TABLE IF NOT EXISTS active_timeouts (
                user_id VARCHAR(20) NOT NULL,
                guild_id VARCHAR(20) NOT NULL,
                expiry_time BIGINT NOT NULL,
                created_at BIGINT NOT NULL,
                notified BOOLEAN DEFAULT 0,
                PRIMARY KEY (user_id, guild_id),
                INDEX idx_expiry (expiry_time, notified)
            )
        `);

        connection.release();
        console.log('✅ Database tables initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        throw error;
    }
}

/**
 * Clean old join tracker entries (older than 1 hour)
 */
export async function cleanOldJoinEntries() {
    try {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        await pool.query(
            'DELETE FROM join_tracker WHERE join_time < ?',
            [oneHourAgo]
        );
    } catch (error) {
        console.error('Error cleaning old join entries:', error);
    }
}

// Export the pool for use in other modules
export default pool;
