import { DataTypes } from 'sequelize';

export default (sequelize) => {
    const Giveaway = sequelize.define('Giveaway', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        guildId: {
            type: DataTypes.STRING,
            allowNull: false
        },
        channelId: {
            type: DataTypes.STRING,
            allowNull: false
        },
        messageId: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        prize: {
            type: DataTypes.STRING,
            allowNull: false
        },
        winnerCount: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        hostId: {
            type: DataTypes.STRING,
            allowNull: false
        },
        endTime: {
            type: DataTypes.DATE,
            allowNull: false
        },
        ended: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        winners: {
            type: DataTypes.JSON,
            defaultValue: []
        },
        participants: {
            type: DataTypes.JSON,
            defaultValue: []
        }
    });

    return Giveaway;
};
