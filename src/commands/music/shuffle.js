import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';

export default {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the queue')
        .setDMPermission(false),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                content: '❌ Tidak ada lagu yang sedang diputar!',
                ephemeral: true
            });
        }

        if (queue.tracks.data.length === 0) {
            return interaction.reply({
                content: '❌ Queue kosong!',
                ephemeral: true
            });
        }

        queue.tracks.shuffle();
        return interaction.reply('🔀 Queue shuffled!');
    },

    cooldown: 2
};
