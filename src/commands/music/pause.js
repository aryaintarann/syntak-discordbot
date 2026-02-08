import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';

export default {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current song')
        .setDMPermission(false),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                content: '❌ Tidak ada lagu yang sedang diputar!',
                ephemeral: true
            });
        }

        if (queue.node.isPaused()) {
            return interaction.reply({
                content: '❌ Lagu sudah di-pause!',
                ephemeral: true
            });
        }

        queue.node.setPaused(true);
        return interaction.reply('⏸️ Paused the music!');
    },

    cooldown: 2
};
