import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Guild } from '../../database/index.js';
import config from '../../config/config.js';
import logger from '../../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The member to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for kicking')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .setDMPermission(false),

    async execute(interaction) {
        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Defer reply immediately to prevent timeout
        await interaction.deferReply();

        // Validation checks
        if (!target) {
            return interaction.editReply({
                content: '❌ User tidak ditemukan di server ini!'
            });
        }

        if (target.id === interaction.user.id) {
            return interaction.editReply({
                content: '❌ Kamu tidak bisa kick diri sendiri!'
            });
        }

        if (target.id === interaction.client.user.id) {
            return interaction.editReply({
                content: '❌ Kamu tidak bisa kick bot!'
            });
        }

        if (!target.kickable) {
            return interaction.editReply({
                content: '❌ Saya tidak bisa kick member ini! (role mereka mungkin lebih tinggi dari bot)'
            });
        }

        try {
            // Send DM to user before kicking
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('🚪 You have been kicked')
                    .setDescription(`You have been kicked from **${interaction.guild.name}**`)
                    .addFields(
                        { name: 'Reason', value: reason },
                        { name: 'Moderator', value: interaction.user.tag }
                    )
                    .setTimestamp();

                await target.user.send({ embeds: [dmEmbed] });
            } catch (error) {
                logger.debug('Could not send DM to user');
            }

            // Kick the member
            await target.kick(reason);

            // Log to mod logs
            const guildData = await Guild.findByPk(interaction.guild.id);
            if (guildData?.modLogChannelId) {
                try {
                    const logChannel = await interaction.guild.channels.fetch(guildData.modLogChannelId);
                    const logEmbed = new EmbedBuilder()
                        .setColor(config.colors.warning)
                        .setTitle('👢 Member Kicked')
                        .setThumbnail(target.user.displayAvatarURL())
                        .addFields(
                            { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
                            { name: 'Moderator', value: interaction.user.tag, inline: true },
                            { name: 'Reason', value: reason }
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
                .setDescription(`✅ **${target.user.tag}** telah di-kick dari server!\n**Reason:** ${reason}`);

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            logger.error('Error kicking member:', error);
            await interaction.editReply({
                content: '❌ Terjadi error saat kick member!'
            });
        }
    },

    cooldown: 3
};
