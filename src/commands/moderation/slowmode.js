import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } from 'discord.js';
import FeatureManager from '../../utils/featureManager.js';
import { colors } from '../../utils/embedBuilder.js';

export default {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set slowmode pada channel')
        .addIntegerOption(option =>
            option.setName('detik')
                .setDescription('Durasi slowmode dalam detik (0 untuk mematikan)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)) // Max 6 hours
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel target (default: channel saat ini)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false))
        .addStringOption(option =>
            option.setName('alasan')
                .setDescription('Alasan mengaktifkan slowmode')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        // Check if feature is enabled
        const isEnabled = await FeatureManager.isEnabled(interaction.guildId, 'moderation', 'slowmode');
        if (!isEnabled) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Fitur Dinonaktifkan')
                    .setDescription('Command `/slowmode` tidak diaktifkan di server ini.\nAdmin dapat mengaktifkannya di Dashboard.')],
                ephemeral: true
            });
        }

        const seconds = interaction.options.getInteger('detik');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const reason = interaction.options.getString('alasan') || 'Tidak ada alasan';

        try {
            await channel.setRateLimitPerUser(seconds, reason);

            // Log the action
            await FeatureManager.logModAction({
                guildId: interaction.guildId,
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                userId: channel.id,
                userTag: `#${channel.name}`,
                actionType: 'slowmode',
                reason: `Set slowmode to ${seconds}s - ${reason}`,
                duration: seconds
            });

            let description;
            if (seconds === 0) {
                description = `Slowmode dimatikan di ${channel}.`;
            } else {
                description = `Slowmode diset ke **${formatDuration(seconds)}** di ${channel}.`;
            }

            const embed = new EmbedBuilder()
                .setColor(seconds === 0 ? colors.info : colors.warn)
                .setTitle(seconds === 0 ? '⏱️ Slowmode Dimatikan' : '⏱️ Slowmode Diaktifkan')
                .setDescription(description)
                .addFields(
                    { name: 'Channel', value: `${channel}`, inline: true },
                    { name: 'Durasi', value: seconds === 0 ? 'Off' : formatDuration(seconds), inline: true },
                    { name: 'Alasan', value: reason, inline: false }
                );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in slowmode command:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Error')
                    .setDescription('Tidak dapat mengatur slowmode. Pastikan bot memiliki permission yang diperlukan.')],
                ephemeral: true
            });
        }
    }
};

function formatDuration(seconds) {
    if (seconds < 60) return `${seconds} detik`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} menit`;
    return `${Math.floor(seconds / 3600)} jam`;
}
