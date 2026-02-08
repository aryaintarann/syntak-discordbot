import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = [];

// Load all commands
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);

    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = await import(`file://${filePath}`);

        if ('data' in command.default) {
            commands.push(command.default.data.toJSON());
            console.log(`✅ Loaded command: ${command.default.data.name}`);
        }
    }
}

console.log(`📦 Total commands to deploy: ${commands.length}`);

// Deploy commands
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
    console.log('🔄 Started refreshing application (/) commands...');

    if (process.env.GUILD_ID) {
        // Deploy to specific guild (faster for testing)
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log(`✅ Successfully deployed ${commands.length} commands to guild ${process.env.GUILD_ID}`);
    } else {
        // Deploy globally
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log(`✅ Successfully deployed ${commands.length} commands globally`);
    }

} catch (error) {
    console.error('❌ Error deploying commands:', error);
    process.exit(1);
}
