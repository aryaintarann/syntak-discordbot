import { SlashCommandBuilder } from 'discord.js';
import logger from '../../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music and clear the queue')
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
            await interaction.client.distube.stop(interaction.guild.id);
            return interaction.reply('⏹️ Stopped the music and cleared the queue!');
        } catch (error) {
            logger.error('Error in stop command:', error);
            return interaction.reply({
                content: `❌ Error stopping music: ${error.message}`,
                ephemeral: true
            });
        }
    },

    cooldown: 2
};
