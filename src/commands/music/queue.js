import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import config from '../../config/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Display the music queue')
        .setDMPermission(false),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                content: '❌ Tidak ada lagu yang sedang diputar!',
                ephemeral: true
            });
        }

        const currentTrack = queue.currentTrack;
        const tracks = queue.tracks.data.slice(0, 10); // Show first 10 tracks

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('🎵 Music Queue')
            .setDescription(
                `**Now Playing:**\n[${currentTrack.title}](${currentTrack.url}) - Requested by ${currentTrack.requestedBy}\n\n` +
                (tracks.length > 0
                    ? `**Up Next:**\n${tracks.map((track, i) =>
                        `${i + 1}. [${track.title}](${track.url}) - ${track.duration}`
                    ).join('\n')}`
                    : '**No more tracks in queue**')
            )
            .setThumbnail(currentTrack.thumbnail)
            .addFields(
                { name: 'Total Tracks', value: `${queue.tracks.data.length}`, inline: true },
                { name: 'Queue Duration', value: queue.estimatedDuration, inline: true },
                { name: 'Volume', value: `${queue.node.volume}%`, inline: true }
            )
            .setFooter({ text: `Loop: ${queue.repeatMode === 0 ? 'Off' : queue.repeatMode === 1 ? 'Track' : 'Queue'}` });

        return interaction.reply({ embeds: [embed] });
    },

    cooldown: 2
};
