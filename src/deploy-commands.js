import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import config from './config/config.js';
import logger from './utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const commands = [];
const commandsPath = join(__dirname, 'commands');
const commandFolders = readdirSync(commandsPath);

// Load all commands
for (const folder of commandFolders) {
    const folderPath = join(commandsPath, folder);
    const commandFiles = readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = join(folderPath, file);
        const fileUrl = pathToFileURL(filePath).href;

        try {
            const command = await import(fileUrl);
            const commandData = command.default;

            if ('data' in commandData) {
                commands.push(commandData.data.toJSON());
            }
        } catch (error) {
            logger.error(`Error loading command at ${filePath}:`, error);
        }
    }
}

// Deploy commands
const rest = new REST().setToken(config.token);

(async () => {
    try {
        logger.info(`Started refreshing ${commands.length} application (/) commands.`);

        // Deploy to specific guild (for testing) or globally
        if (config.guildId) {
            // Guild-specific deployment (instant)
            const data = await rest.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: commands }
            );
            logger.success(`Successfully deployed ${data.length} commands to guild ${config.guildId}.`);
        } else {
            // Global deployment (takes up to 1 hour)
            const data = await rest.put(
                Routes.applicationCommands(config.clientId),
                { body: commands }
            );
            logger.success(`Successfully deployed ${data.length} commands globally.`);
        }
    } catch (error) {
        logger.error('Error deploying commands:', error);
    }
})();
