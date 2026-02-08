import { DataTypes } from 'sequelize';

export default (sequelize) => {
    const User = sequelize.define('User', {
        userId: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false
        },
        guildId: {
            type: DataTypes.STRING,
            allowNull: false
        },
        // Economy
        balance: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        bank: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        lastDaily: {
            type: DataTypes.DATE,
            allowNull: true
        },
        dailyStreak: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        lastWork: {
            type: DataTypes.DATE,
            allowNull: true
        },
        lastCrime: {
            type: DataTypes.DATE,
            allowNull: true
        },
        inventory: {
            type: DataTypes.JSON,
            defaultValue: []
        },
        // Leveling
        xp: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        level: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        totalMessages: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        voiceTime: {
            type: DataTypes.INTEGER,
            defaultValue: 0 // in seconds
        },
        lastXpGain: {
            type: DataTypes.DATE,
            allowNull: true
        },
        // Moderation tracking
        warnCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        muteCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        kickCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        banCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    }, {
        indexes: [
            {
                unique: true,
                fields: ['userId', 'guildId']
            },
            {
                fields: ['guildId', 'xp']
            }
        ]
    });

    // Instance methods
    User.prototype.addXp = async function (amount) {
        this.xp += amount;
        this.totalMessages += 1;

        // Calculate level
        const config = (await import('../../config/config.js')).default;
        let newLevel = 1;
        while (this.xp >= config.leveling.levelFormula(newLevel)) {
            newLevel++;
        }

        const leveledUp = newLevel > this.level;
        this.level = newLevel;

        await this.save();
        return { leveledUp, newLevel };
    };

    User.prototype.addBalance = async function (amount) {
        this.balance += amount;
        await this.save();
        return this.balance;
    };

    User.prototype.removeBalance = async function (amount) {
        if (this.balance < amount) {
            return false;
        }
        this.balance -= amount;
        await this.save();
        return true;
    };

    return User;
};
