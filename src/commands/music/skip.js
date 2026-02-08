import { SlashCommandBuilder } from 'discord.js';
import logger from '../../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song')
        .setDMPermission(false),

    async execute(interaction) {
        const queue = interaction.client.distube.getQueue(interaction.guild.id);

        if (!queue) {
            return interaction.reply({
                content: '❌ Tidak ada lagu yang sedang diputar!',
                ephemeral: true
            });
        }

        try {
            await interaction.client.distube.skip(interaction.guild.id);
            return interaction.reply('⏭️ Skipped to the next song!');
        } catch (error) {
            logger.error('Error in skip command:', error);
            return interaction.reply({
                content: `❌ Error skipping song: ${error.message}`,
                ephemeral: true
            });
        }
    },

    cooldown: 2
};
