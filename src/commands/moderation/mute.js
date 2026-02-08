import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Guild } from '../../database/index.js';
import config from '../../config/config.js';
import logger from '../../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Timeout a member (prevent them from sending messages)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The member to mute')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration in minutes (1-40320 = 28 days)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for muting')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = interaction.guild.members.cache.get(target.id);

        if (!member) {
            return interaction.reply({
                content: '❌ User tidak ditemukan di server ini!',
                ephemeral: true
            });
        }

        if (!member.moderatable) {
            return interaction.reply({
                content: '❌ Saya tidak bisa mute member ini! (role mereka mungkin lebih tinggi dari bot)',
                ephemeral: true
            });
        }

        if (member.id === interaction.user.id) {
            return interaction.reply({
                content: '❌ Kamu tidak bisa mute dirimu sendiri!',
                ephemeral: true
            });
        }

        try {
            // Calculate timeout duration in milliseconds
            const timeoutUntil = Date.now() + (duration * 60 * 1000);

            // Timeout the member
            await member.timeout(duration * 60 * 1000, reason);

            // Format duration for display
            const formatDuration = (minutes) => {
                if (minutes < 60) return `${minutes} menit`;
                if (minutes < 1440) return `${Math.floor(minutes / 60)} jam`;
                return `${Math.floor(minutes / 1440)} hari`;
            };

            // Log to mod logs
            const guildData = await Guild.findByPk(interaction.guild.id);
            if (guildData?.modLogChannelId) {
                try {
                    const logChannel = await interaction.guild.channels.fetch(guildData.modLogChannelId);
                    const logEmbed = new EmbedBuilder()
                        .setColor(config.colors.warning)
                        .setTitle('🔇 Member Muted')
                        .setThumbnail(target.displayAvatarURL())
                        .addFields(
                            { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                            { name: 'Moderator', value: interaction.user.tag, inline: true },
                            { name: 'Duration', value: formatDuration(duration), inline: true },
                            { name: 'Reason', value: reason },
                            { name: 'Until', value: `<t:${Math.floor(timeoutUntil / 1000)}:F>` }
                        )
                        .setTimestamp();

                    await logChannel.send({ embeds: [logEmbed] });
                } catch (error) {
                    logger.error('Error sending to mod log:', error);
                }
            }

            // Reply to command
            const embed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription(
                    `✅ **${target.tag}** telah di-mute selama **${formatDuration(duration)}**!\n` +
                    `**Reason:** ${reason}\n` +
                    `**Unmute:** <t:${Math.floor(timeoutUntil / 1000)}:R>`
                );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            logger.error('Error muting member:', error);
            await interaction.reply({
                content: '❌ Terjadi error saat mute member!',
                ephemeral: true
            });
        }
    },

    cooldown: 3
};
