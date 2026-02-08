import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import config from '../../config/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('Apply audio filters to the music')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Filter type')
                .setRequired(true)
                .addChoices(
                    { name: 'Off', value: 'off' },
                    { name: 'Bassboost', value: 'bassboost' },
                    { name: 'Nightcore', value: 'nightcore' },
                    { name: 'Vaporwave', value: 'vaporwave' },
                    { name: '8D', value: '8D' },
                    { name: 'Treble', value: 'treble' }
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

        await interaction.deferReply();

        const filterType = interaction.options.getString('type');

        try {
            if (filterType === 'off') {
                await queue.filters.ffmpeg.setFilters(false);
                return interaction.editReply('✅ All filters removed!');
            }

            const filters = {
                bassboost: 'bass=g=20',
                nightcore: 'aresample=48000,asetrate=48000*1.25',
                vaporwave: 'aresample=48000,asetrate=48000*0.8',
                '8D': 'apulsator=hz=0.09',
                treble: 'treble=g=5'
            };

            await queue.filters.ffmpeg.toggle([filterType]);

            const embed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription(`✅ Filter **${filterType}** applied!`);

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error('Error applying filter:', error);
            return interaction.editReply('❌ Error applying filter! Coba lagi.');
        }
    },

    cooldown: 3
};
