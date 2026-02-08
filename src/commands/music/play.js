import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { useMainPlayer, useQueue } from 'discord-player';
import config from '../../config/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song from YouTube, Spotify, or SoundCloud')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name or URL')
                .setRequired(true))
        .setDMPermission(false),

    async execute(interaction) {
        const query = interaction.options.getString('query');
        const member = interaction.member;

        // Check if user is in a voice channel
        if (!member.voice.channel) {
            return interaction.reply({
                content: '❌ Kamu harus berada di voice channel terlebih dahulu!',
                ephemeral: true
            });
        }

        // Check bot permissions
        const permissions = member.voice.channel.permissionsFor(interaction.client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return interaction.reply({
                content: '❌ Bot tidak memiliki permission untuk join/speak di voice channel!',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const player = useMainPlayer();

            const searchResult = await player.search(query, {
                requestedBy: interaction.user,
                searchEngine: query.includes('spotify') ? 'spotify' :
                    query.includes('soundcloud') ? 'soundcloud' :
                        'youtube'
            });

            if (!searchResult || !searchResult.tracks.length) {
                return interaction.editReply('❌ Lagu tidak ditemukan!');
            }

            const queue = useQueue(interaction.guild.id);

            try {
                const { track } = await player.play(member.voice.channel, searchResult, {
                    nodeOptions: {
                        metadata: {
                            channel: interaction.channel,
                            client: interaction.guild.members.me,
                            requestedBy: interaction.user
                        },
                        leaveOnEmpty: true,
                        leaveOnEmptyCooldown: 300000, // 5 minutes
                        leaveOnEnd: true,
                        leaveOnEndCooldown: 300000,
                        bufferingTimeout: 3000,
                        volume: 50
                    }
                });

                const embed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle('🎵 Now Playing')
                    .setDescription(`**[${track.title}](${track.url})**`)
                    .setThumbnail(track.thumbnail)
                    .addFields(
                        { name: 'Duration', value: track.duration, inline: true },
                        { name: 'Requested By', value: interaction.user.toString(), inline: true },
                        { name: 'Author', value: track.author, inline: true }
                    );

                if (queue && queue.tracks.data.length > 0) {
                    embed.addFields({ name: 'Position in Queue', value: `${queue.tracks.data.length}` });
                }

                return interaction.editReply({ embeds: [embed] });
            } catch (error) {
                logger.error('Error playing track:', error);
                return interaction.editReply('❌ Error saat memutar lagu!');
            }
        } catch (error) {
            logger.error('Error searching for track:', error);
            return interaction.editReply('❌ Error saat mencari lagu!');
        }
    },

    cooldown: 2
};
