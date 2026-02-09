import pool from '../database.js';

/**
 * Get custom automod configuration from database
 */
export async function getAutomodConfig(guildId) {
    try {
        const [rows] = await pool.query(
            'SELECT config_data, auto_mod_enabled FROM guild_config WHERE guild_id = ?',
            [guildId]
        );

        if (!rows || rows.length === 0) {
            return null;
        }

        const config = rows[0];

        // Parse config_data JSON
        let automodConfig = {
            enabled: !!config.auto_mod_enabled,
            badWords: [],
            spam: {
                messageThreshold: 5,
                timeWindow: 5
            },
            filters: {
                linkSpam: true,
                massMention: true,
                inviteLinks: true,
                caps: false
            }
        };

        if (config.config_data) {
            try {
                const parsed = typeof config.config_data === 'string'
                    ? JSON.parse(config.config_data)
                    : config.config_data;

                if (parsed.automod) {
                    automodConfig = { ...automodConfig, ...parsed.automod };
                }
            } catch (e) {
                console.error('Error parsing config_data:', e);
            }
        }

        return automodConfig;
    } catch (error) {
        console.error('Error getting automod config:', error);
        return null;
    }
}
