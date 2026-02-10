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

        // Create mod_cases table for comprehensive action logging
        await connection.query(`
            CREATE TABLE IF NOT EXISTS mod_cases (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guild_id VARCHAR(20) NOT NULL,
                case_number INT NOT NULL,
                user_id VARCHAR(20) NOT NULL,
                user_tag VARCHAR(100),
                moderator_id VARCHAR(20) NOT NULL,
                moderator_tag VARCHAR(100),
                action_type VARCHAR(20) NOT NULL,
                reason TEXT,
                duration INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_guild_case (guild_id, case_number),
                INDEX idx_guild_user (guild_id, user_id)
            )
        `);

        // Create user_notes table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_notes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guild_id VARCHAR(20) NOT NULL,
                user_id VARCHAR(20) NOT NULL,
                moderator_id VARCHAR(20) NOT NULL,
                moderator_tag VARCHAR(100),
                note TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_guild_user (guild_id, user_id)
            )
        `);

        // Create message_logs table for edit/delete tracking
        await connection.query(`
            CREATE TABLE IF NOT EXISTS message_logs (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                guild_id VARCHAR(20) NOT NULL,
                channel_id VARCHAR(20) NOT NULL,
                message_id VARCHAR(20) NOT NULL,
                user_id VARCHAR(20) NOT NULL,
                user_tag VARCHAR(100),
                content TEXT,
                attachments JSON,
                action_type VARCHAR(10) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_guild_channel (guild_id, channel_id),
                INDEX idx_message (message_id),
                INDEX idx_created (created_at)
            )
        `);

        // Ticket Config
        await connection.query(`
            CREATE TABLE IF NOT EXISTS ticket_config (
                guild_id VARCHAR(20) PRIMARY KEY,
                category_id VARCHAR(20),
                transcript_channel_id VARCHAR(20),
                welcome_message TEXT,
                staff_role_id VARCHAR(20)
            )
        `);

        // Tickets
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guild_id VARCHAR(20),
                user_id VARCHAR(20),
                channel_id VARCHAR(20),
                created_at BIGINT,
                closed_at BIGINT,
                transcript_url TEXT,
                INDEX idx_guild_user (guild_id, user_id)
            )
        `);

        // Welcomer Config
        await connection.query(`
            CREATE TABLE IF NOT EXISTS welcomer_config (
                guild_id VARCHAR(20) PRIMARY KEY,
                welcome_channel_id VARCHAR(20),
                welcome_message TEXT,
                welcome_background_url TEXT,
                welcome_enabled BOOLEAN DEFAULT FALSE,
                goodbye_channel_id VARCHAR(20),
                goodbye_message TEXT,
                goodbye_background_url TEXT,
                goodbye_enabled BOOLEAN DEFAULT FALSE
            )
        `);

        // Reaction Roles
        await connection.query(`
            CREATE TABLE IF NOT EXISTS reaction_roles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guild_id VARCHAR(20),
                message_id VARCHAR(20),
                channel_id VARCHAR(20),
                emoji VARCHAR(255),
                role_id VARCHAR(20),
                INDEX idx_message (message_id)
            )
        `);

        // Giveaways
        await connection.query(`
            CREATE TABLE IF NOT EXISTS giveaways (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guild_id VARCHAR(20),
                channel_id VARCHAR(20),
                message_id VARCHAR(20),
                prize TEXT,
                end_time BIGINT,
                winners_count INT,
                ended BOOLEAN DEFAULT FALSE,
                host_id VARCHAR(20)
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
