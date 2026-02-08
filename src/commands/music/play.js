import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import config from '../../config/config.js';
import logger from '../../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song or playlist from YouTube or Spotify')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name, YouTube URL, or Spotify URL')
                .setRequired(true))
        .setDMPermission(false),

    async execute(interaction) {
        const query = interaction.options.getString('query');
        const member = interaction.member;

        // 1. Check Voice Channel
        if (!member.voice.channel) {
            return interaction.reply({
                content: '❌ Kamu harus berada di voice channel terlebih dahulu!',
                ephemeral: true
            });
        }

        // 2. Check Permissions
        const permissions = member.voice.channel.permissionsFor(interaction.client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return interaction.reply({
                content: '❌ Bot tidak memiliki permission untuk join/speak di voice channel!',
                ephemeral: true
            });
        }

        // 3. Defer Reply (Crucial for longer operations like playlist loading)
        await interaction.deferReply();

        try {
            const distube = interaction.client.distube;

            // 4. Execute Play
            await distube.play(member.voice.channel, query, {
                member: member,
                textChannel: interaction.channel,
                metadata: {
                    interaction: interaction
                }
            });

            // 5. Initial Feedback
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setDescription(`🔍 **Processing:** \`${query}\``)
                ]
            });

        } catch (error) {
            logger.error('Error in play command:', error);

            const errorMessage = `❌ Error: ${error.message}`;

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: errorMessage, embeds: [] });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    },

    cooldown: 3
};
