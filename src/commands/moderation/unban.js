import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { logModAction } from '../../database/models/ModLog.js';
import { createModActionEmbed, createErrorEmbed, createSuccessEmbed } from '../../utils/embedBuilder.js';
import pool from '../../database/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(option =>
            option
                .setName('user_id')
                .setDescription('The ID of the user to unban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the unban')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const userId = interaction.options.getString('user_id');
            const reason = interaction.options.getString('reason') || 'No reason provided';

            // Validate user ID format (Discord IDs are 17-19 digits)
            if (!/^\d{17,19}$/.test(userId)) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'User ID tidak valid. Pastikan format ID benar (17-19 digit angka).')],
                    ephemeral: true
                });
            }

            // Check if user is actually banned
            let bannedUser;
            try {
                bannedUser = await interaction.guild.bans.fetch(userId);
            } catch (error) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'User dengan ID tersebut tidak ditemukan di ban list.')],
                    ephemeral: true
                });
            }

            // Unban the user
            await interaction.guild.members.unban(userId, reason);

            // Get user info for logging
            const user = bannedUser.user;

            // Log to database
            await logModAction(
                'unban',
                user.id,
                user.tag,
                interaction.user.id,
                interaction.user.tag,
                interaction.guild.id,
                reason
            );

            // Send confirmation
            await interaction.reply({
                embeds: [createSuccessEmbed(
                    'User Unbanned',
                    `${user.tag} (${user.id}) telah di-unban dari server.\n**Alasan:** ${reason}`
                )]
            });

            // Log to mod channel
            await logToModChannel(interaction, user, reason);

        } catch (error) {
            console.error('Error in unban command:', error);

            const errorEmbed = createErrorEmbed(
                'Error',
                'Terjadi kesalahan saat melakukan unban. Pastikan bot memiliki permission yang cukup dan user ID benar.'
            );

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};

async function logToModChannel(interaction, user, reason) {
    try {
        const [rows] = await pool.query(
            'SELECT mod_log_channel FROM guild_config WHERE guild_id = ?',
            [interaction.guild.id]
        );

        if (!rows || rows.length === 0 || !rows[0].mod_log_channel) return;

        const channel = interaction.guild.channels.cache.get(rows[0].mod_log_channel);
        if (!channel) return;

        const embed = createModActionEmbed(
            'unban',
            user,
            interaction.user,
            reason
        );

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error logging to mod channel:', error);
    }
}
