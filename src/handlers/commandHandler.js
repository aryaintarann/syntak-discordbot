import { Collection } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async (client) => {
    client.commands = new Collection();

    const commandsPath = join(__dirname, '..', 'commands');
    const commandFolders = readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = join(commandsPath, folder);
        const commandFiles = readdirSync(folderPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = join(folderPath, file);
            const fileUrl = pathToFileURL(filePath).href;

            try {
                const command = await import(fileUrl);
                const commandData = command.default;

                if ('data' in commandData && 'execute' in commandData) {
                    client.commands.set(commandData.data.name, commandData);
                    logger.info(`Loaded command: ${commandData.data.name}`);
                } else {
                    logger.warn(`Command at ${filePath} is missing required "data" or "execute" property.`);
                }
            } catch (error) {
                logger.error(`Error loading command at ${filePath}:`, error);
            }
        }
    }

    logger.success(`Loaded ${client.commands.size} commands.`);
};
