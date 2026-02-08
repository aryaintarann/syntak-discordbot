import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';

export default {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Set loop mode')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Loop mode')
                .setRequired(true)
                .addChoices(
                    { name: 'Off', value: 'off' },
                    { name: 'Track', value: 'track' },
                    { name: 'Queue', value: 'queue' }
                ))
        .setDMPermission(false),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                content: '❌ Tidak ada lagu yang sedang diputar!',
                ephemeral: true
            });
        }

        const mode = interaction.options.getString('mode');

        switch (mode) {
            case 'off':
                queue.setRepeatMode(0);
                return interaction.reply('🔁 Loop mode: **Off**');
            case 'track':
                queue.setRepeatMode(1);
                return interaction.reply('🔂 Loop mode: **Track**');
            case 'queue':
                queue.setRepeatMode(2);
                return interaction.reply('🔁 Loop mode: **Queue**');
        }
    },

    cooldown: 2
};
