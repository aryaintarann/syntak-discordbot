import { Sequelize } from 'sequelize';
import config from '../config/config.js';
import logger from '../utils/logger.js';

// Import models
import UserModel from './models/User.js';
import GuildModel from './models/Guild.js';
import WarningModel from './models/Warning.js';
import TicketModel from './models/Ticket.js';
import TransactionModel from './models/Transaction.js';
import ReactionRoleModel from './models/ReactionRole.js';
import GiveawayModel from './models/Giveaway.js';

// Initialize Sequelize
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: config.database.path,
    logging: config.database.logging ? logger.debug : false
});

// Initialize models
const User = UserModel(sequelize);
const Guild = GuildModel(sequelize);
const Warning = WarningModel(sequelize);
const Ticket = TicketModel(sequelize);
const Transaction = TransactionModel(sequelize);
const ReactionRole = ReactionRoleModel(sequelize);
const Giveaway = GiveawayModel(sequelize);

// Define associations
User.hasMany(Warning, { foreignKey: 'userId', as: 'warnings' });
Warning.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'userId' });

Guild.hasMany(Ticket, { foreignKey: 'guildId', as: 'tickets' });
Ticket.belongsTo(Guild, { foreignKey: 'guildId' });

Guild.hasMany(ReactionRole, { foreignKey: 'guildId', as: 'reactionRoles' });
ReactionRole.belongsTo(Guild, { foreignKey: 'guildId' });

Guild.hasMany(Giveaway, { foreignKey: 'guildId', as: 'giveaways' });
Giveaway.belongsTo(Guild, { foreignKey: 'guildId' });

// Sync database
async function syncDatabase() {
    try {
        await sequelize.authenticate();
        logger.success('Database connection established successfully.');

        await sequelize.sync({ alter: true });
        logger.success('Database synchronized successfully.');
    } catch (error) {
        logger.error('Unable to connect to the database:', error);
        process.exit(1);
    }
}

export {
    sequelize,
    User,
    Guild,
    Warning,
    Ticket,
    Transaction,
    ReactionRole,
    Giveaway,
    syncDatabase
};
