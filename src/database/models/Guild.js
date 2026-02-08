import { DataTypes } from 'sequelize';

export default (sequelize) => {
    const Guild = sequelize.define('Guild', {
        guildId: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false
        },
        prefix: {
            type: DataTypes.STRING,
            defaultValue: '!'
        },
        // Channel configurations
        welcomeChannelId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        goodbyeChannelId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        modLogChannelId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        ticketCategoryId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        ticketLogChannelId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        // Role configurations
        mutedRoleId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        autoRoles: {
            type: DataTypes.JSON,
            defaultValue: [] // Array of role IDs to assign on join
        },
        // Moderation settings
        autoModEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        antiSpamEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        antiRaidEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        badWords: {
            type: DataTypes.JSON,
            defaultValue: []
        },
        allowedInvites: {
            type: DataTypes.JSON,
            defaultValue: [] // Whitelisted server invite codes
        },
        // Welcome/Goodbye messages
        welcomeMessage: {
            type: DataTypes.TEXT,
            defaultValue: 'Welcome {user} to {server}! You are member #{count}.'
        },
        goodbyeMessage: {
            type: DataTypes.TEXT,
            defaultValue: 'Goodbye {user}! We will miss you.'
        },
        welcomeEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        goodbyeEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        // Leveling settings
        levelingEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        levelUpChannelId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        levelUpMessage: {
            type: DataTypes.TEXT,
            defaultValue: 'Congratulations {user}! You reached level {level}!'
        },
        levelRoles: {
            type: DataTypes.JSON,
            defaultValue: {} // { "5": "roleId", "10": "roleId" }
        },
        // Economy settings
        economyEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        shopItems: {
            type: DataTypes.JSON,
            defaultValue: [] // Array of shop items
        }
    });

    return Guild;
};
