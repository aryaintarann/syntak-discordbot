import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async (client) => {
    const eventsPath = join(__dirname, '..', 'events');
    const eventFiles = readdirSync(eventsPath, { recursive: true })
        .filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = join(eventsPath, file);
        const fileUrl = pathToFileURL(filePath).href;

        try {
            const event = await import(fileUrl);
            const eventData = event.default;

            if (eventData.once) {
                client.once(eventData.name, (...args) => eventData.execute(...args, client));
            } else {
                client.on(eventData.name, (...args) => eventData.execute(...args, client));
            }

            logger.info(`Loaded event: ${eventData.name}`);
        } catch (error) {
            logger.error(`Error loading event at ${filePath}:`, error);
        }
    }

    logger.success('All events loaded.');
};
