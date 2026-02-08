import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Guild } from '../../database/index.js';
import config from '../../config/config.js';
import logger from '../../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from the server')
        .addStringOption(option =>
            option.setName('user_id')
                .setDescription('The ID of the user to unban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for unbanning')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDMPermission(false),

    async execute(interaction) {
        const userId = interaction.options.getString('user_id');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Defer reply immediately
        await interaction.deferReply();

        // Validate user ID format
        if (!/^\d{17,19}$/.test(userId)) {
            return interaction.editReply({
                content: '❌ Invalid user ID format! User ID harus berupa angka 17-19 digit.'
            });
        }

        try {
            // Check if user is actually banned
            const bans = await interaction.guild.bans.fetch();
            const bannedUser = bans.get(userId);

            if (!bannedUser) {
                return interaction.editReply({
                    content: '❌ User dengan ID tersebut tidak ditemukan dalam ban list!'
                });
            }

            // Unban the user
            await interaction.guild.members.unban(userId, reason);

            // Get user info for display
            const user = bannedUser.user;

            // Log to mod logs
            const guildData = await Guild.findByPk(interaction.guild.id);
            if (guildData?.modLogChannelId) {
                try {
                    const logChannel = await interaction.guild.channels.fetch(guildData.modLogChannelId);
                    const logEmbed = new EmbedBuilder()
                        .setColor(config.colors.success)
                        .setTitle('✅ Member Unbanned')
                        .setThumbnail(user.displayAvatarURL())
                        .addFields(
                            { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
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
                .setTitle('✅ User Unbanned')
                .setDescription(`**${user.tag}** telah di-unban dari server!`)
                .addFields(
                    { name: 'User ID', value: userId, inline: true },
                    { name: 'Reason', value: reason, inline: true }
                )
                .setThumbnail(user.displayAvatarURL());

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            logger.error('Error unbanning user:', error);
            await interaction.editReply({
                content: '❌ Terjadi error saat unban user! Pastikan ID benar dan user memang di-ban.'
            });
        }
    },

    cooldown: 3
};
