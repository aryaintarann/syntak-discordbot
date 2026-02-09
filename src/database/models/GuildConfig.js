import pool from '../database.js';

/**
 * Get guild configuration
 */
export async function getGuildConfig(guildId) {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM guild_config WHERE guild_id = ?',
            [guildId]
        );

        if (rows.length === 0) {
            // Create default config if doesn't exist
            await createDefaultConfig(guildId);
            return await getGuildConfig(guildId);
        }

        // Parse JSON fields
        if (rows[0].config_data) {
            rows[0].config_data = JSON.parse(rows[0].config_data);
        }

        return rows[0];
    } catch (error) {
        console.error('Error getting guild config:', error);
        throw error;
    }
}

/**
 * Create default config for a guild
 */
async function createDefaultConfig(guildId) {
    try {
        await pool.query(
            'INSERT INTO guild_config (guild_id, auto_mod_enabled, raid_protection_enabled, max_warnings, auto_action) VALUES (?, ?, ?, ?, ?)',
            [guildId, true, true, 3, 'timeout']
        );
    } catch (error) {
        console.error('Error creating default config:', error);
        throw error;
    }
}

/**
 * Update guild configuration
 */
export async function updateGuildConfig(guildId, updates) {
    try {
        const fields = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }

        values.push(guildId);

        const [result] = await pool.query(
            `UPDATE guild_config SET ${fields.join(', ')} WHERE guild_id = ?`,
            values
        );

        return result.affectedRows;
    } catch (error) {
        console.error('Error updating guild config:', error);
        throw error;
    }
}

/**
 * Set mod log channel for a guild
 */
export async function setModLogChannel(guildId, channelId) {
    try {
        const config = await getGuildConfig(guildId);

        const [result] = await pool.query(
            'UPDATE guild_config SET mod_log_channel = ? WHERE guild_id = ?',
            [channelId, guildId]
        );

        return result.affectedRows;
    } catch (error) {
        console.error('Error setting mod log channel:', error);
        throw error;
    }
}

/**
 * Toggle auto-moderation
 */
export async function toggleAutoMod(guildId, enabled) {
    try {
        await pool.query(
            'UPDATE guild_config SET auto_mod_enabled = ? WHERE guild_id = ?',
            [enabled, guildId]
        );
    } catch (error) {
        console.error('Error toggling auto-mod:', error);
        throw error;
    }
}

/**
 * Toggle raid protection
 */
export async function toggleRaidProtection(guildId, enabled) {
    try {
        await pool.query(
            'UPDATE guild_config SET raid_protection_enabled = ? WHERE guild_id = ?',
            [enabled, guildId]
        );
    } catch (error) {
        console.error('Error toggling raid protection:', error);
        throw error;
    }
}
