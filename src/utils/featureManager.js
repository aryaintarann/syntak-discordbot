import pool from '../database/database.js';

/**
 * Feature Manager - Handles per-server feature toggles
 * All configuration is stored in guild_config.config_data JSON field
 */
class FeatureManager {
    /**
     * Default feature configuration for new servers
     */
    static getDefaultConfig() {
        return {
            features: {
                // Moderation Commands
                moderation: {
                    purge: { enabled: true },
                    slowmode: { enabled: true },
                    mute: { enabled: true },
                    history: { enabled: true },
                    note: { enabled: true },
                    case: { enabled: true },
                    roleall: { enabled: false }
                },
                // Logging Features
                logging: {
                    modLog: { enabled: false, channelId: null },
                    messageLog: { enabled: false, channelId: null },
                    joinLeaveLog: { enabled: false, channelId: null },
                    voiceLog: { enabled: false, channelId: null },
                    roleLog: { enabled: false, channelId: null }
                },
                // Security Features
                security: {
                    accountAge: { enabled: false, minDays: 7, action: 'kick' },
                    verification: { enabled: false, type: 'button', channelId: null, roleId: null },
                    altDetection: { enabled: false },
                    phishingDetection: { enabled: true },
                    autoRaidBan: { enabled: false }
                },
                // AutoMod Improvements
                automod: {
                    // Existing filters have their own config
                    escalatingPunishment: {
                        enabled: false,
                        thresholds: {
                            warnToTimeout: 3,
                            timeoutToBan: 5
                        }
                    },
                    duplicateDetection: { enabled: false, threshold: 3, timeWindow: 60 },
                    emojiSpam: { enabled: false, maxEmojis: 10 },
                    newlineSpam: { enabled: false, maxNewlines: 10 },
                    regexFilters: [] // Array of { pattern: string, action: string, reason: string }
                }
            }
        };
    }

    /**
     * Get the full feature config for a guild
     * @param {string} guildId 
     * @returns {Promise<object>}
     */
    static async getGuildConfig(guildId) {
        try {
            const [rows] = await pool.query(
                'SELECT config_data FROM guild_config WHERE guild_id = ?',
                [guildId]
            );

            if (rows.length === 0 || !rows[0].config_data) {
                return this.getDefaultConfig();
            }

            const stored = typeof rows[0].config_data === 'string'
                ? JSON.parse(rows[0].config_data)
                : rows[0].config_data;

            // Merge with defaults to ensure all keys exist
            const defaults = this.getDefaultConfig();
            return this.deepMerge(defaults, stored);
        } catch (error) {
            console.error('Error getting guild config:', error);
            return this.getDefaultConfig();
        }
    }

    /**
     * Check if a specific feature is enabled
     * @param {string} guildId 
     * @param {string} category - e.g., 'moderation', 'logging', 'security', 'automod'
     * @param {string} feature - e.g., 'purge', 'modLog', 'accountAge'
     * @returns {Promise<boolean>}
     */
    static async isEnabled(guildId, category, feature) {
        const config = await this.getGuildConfig(guildId);
        return config.features?.[category]?.[feature]?.enabled ?? false;
    }

    /**
     * Get configuration for a specific feature
     * @param {string} guildId 
     * @param {string} category 
     * @param {string} feature 
     * @returns {Promise<object|null>}
     */
    static async getFeatureConfig(guildId, category, feature) {
        const config = await this.getGuildConfig(guildId);
        return config.features?.[category]?.[feature] ?? null;
    }

    /**
     * Update a specific feature's configuration
     * @param {string} guildId 
     * @param {string} category 
     * @param {string} feature 
     * @param {object} featureConfig 
     */
    static async setFeatureConfig(guildId, category, feature, featureConfig) {
        try {
            const config = await this.getGuildConfig(guildId);

            if (!config.features[category]) {
                config.features[category] = {};
            }
            config.features[category][feature] = featureConfig;

            await this.saveConfig(guildId, config);
        } catch (error) {
            console.error('Error setting feature config:', error);
            throw error;
        }
    }

    /**
     * Toggle a feature on/off
     * @param {string} guildId 
     * @param {string} category 
     * @param {string} feature 
     * @param {boolean} enabled 
     */
    static async setEnabled(guildId, category, feature, enabled) {
        const featureConfig = await this.getFeatureConfig(guildId, category, feature) || {};
        featureConfig.enabled = enabled;
        await this.setFeatureConfig(guildId, category, feature, featureConfig);
    }

    /**
     * Save the full config to database
     * @param {string} guildId 
     * @param {object} config 
     */
    static async saveConfig(guildId, config) {
        await pool.query(
            `INSERT INTO guild_config (guild_id, config_data) 
             VALUES (?, ?) 
             ON DUPLICATE KEY UPDATE config_data = ?`,
            [guildId, JSON.stringify(config), JSON.stringify(config)]
        );
    }

    /**
     * Deep merge two objects
     * @param {object} target 
     * @param {object} source 
     * @returns {object}
     */
    static deepMerge(target, source) {
        const result = { ...target };
        for (const key of Object.keys(source)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    /**
     * Get next case number for a guild
     * @param {string} guildId 
     * @returns {Promise<number>}
     */
    static async getNextCaseNumber(guildId) {
        const [rows] = await pool.query(
            'SELECT MAX(case_number) as maxCase FROM mod_cases WHERE guild_id = ?',
            [guildId]
        );
        return (rows[0]?.maxCase || 0) + 1;
    }

    /**
     * Log a moderation action
     * @param {object} data
     */
    static async logModAction(data) {
        const { guildId, userId, userTag, moderatorId, moderatorTag, actionType, reason, duration } = data;

        const caseNumber = await this.getNextCaseNumber(guildId);

        await pool.query(
            `INSERT INTO mod_cases (guild_id, case_number, user_id, user_tag, moderator_id, moderator_tag, action_type, reason, duration)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [guildId, caseNumber, userId, userTag, moderatorId, moderatorTag, actionType, reason, duration]
        );

        return caseNumber;
    }
}

export default FeatureManager;
