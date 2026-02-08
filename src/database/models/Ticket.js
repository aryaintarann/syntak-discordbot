import { DataTypes } from 'sequelize';

export default (sequelize) => {
    const Ticket = sequelize.define('Ticket', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        ticketId: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        guildId: {
            type: DataTypes.STRING,
            allowNull: false
        },
        channelId: {
            type: DataTypes.STRING,
            allowNull: false
        },
        userId: {
            type: DataTypes.STRING,
            allowNull: false
        },
        subject: {
            type: DataTypes.STRING,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('open', 'closed'),
            defaultValue: 'open'
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        closedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        closedBy: {
            type: DataTypes.STRING,
            allowNull: true
        },
        transcriptPath: {
            type: DataTypes.STRING,
            allowNull: true
        }
    });

    return Ticket;
};
