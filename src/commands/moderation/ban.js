import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Guild, User } from '../../database/index.js';
import config from '../../config/config.js';
import logger from '../../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The member to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for banning')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('delete_days')
                .setDescription('Delete messages from the last X days (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDMPermission(false),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteMessages = interaction.options.getInteger('delete_messages') || 0;

        // Defer reply immediately
        await interaction.deferReply();

        const member = interaction.guild.members.cache.get(target.id);

        if (member) {
            if (!member.bannable) {
                return interaction.editReply({
                    content: '❌ Saya tidak bisa ban member ini! (role mereka mungkin lebih tinggi dari bot)'
                });
            }

            if (member.id === interaction.user.id) {
                return interaction.editReply({
                    content: '❌ Kamu tidak bisa ban dirimu sendiri!'
                });
            }
        }

        try {
            // Send DM to user before banning
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('🔨 You have been banned')
                    .setDescription(`You have been banned from **${interaction.guild.name}**`)
                    .addFields(
                        { name: 'Reason', value: reason },
                        { name: 'Moderator', value: interaction.user.tag }
                    )
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                logger.debug('Could not send DM to user');
            }

            // Ban the user
            await interaction.guild.members.ban(target, {
                reason: reason,
                deleteMessageSeconds: deleteMessages * 24 * 60 * 60
            });

            // Update user stats
            const userData = await User.findOne({
                where: { userId: target.id, guildId: interaction.guild.id }
            });
            if (userData) {
                userData.banCount += 1;
                await userData.save();
            }

            // Log to mod logs
            const guildData = await Guild.findByPk(interaction.guild.id);
            if (guildData?.modLogChannelId) {
                try {
                    const logChannel = await interaction.guild.channels.fetch(guildData.modLogChannelId);
                    const logEmbed = new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('🔨 Member Banned')
                        .setThumbnail(target.displayAvatarURL())
                        .addFields(
                            { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                            { name: 'Moderator', value: interaction.user.tag, inline: true },
                            { name: 'Reason', value: reason },
                            { name: 'Messages Deleted', value: `Last ${deleteMessages} days` }
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
                .setDescription(`✅ **${target.tag}** telah di-ban dari server!\n**Reason:** ${reason}`);

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            logger.error('Error banning user:', error);
            await interaction.editReply({
                content: '❌ Terjadi error saat ban user!'
            });
        }
    },

    cooldown: 3
};
