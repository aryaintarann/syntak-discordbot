import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { hasPermission, canModerate } from '../../utils/permissions.js';
import { logModAction } from '../../database/models/ModLog.js';
import { createModActionEmbed, createErrorEmbed, createSuccessEmbed } from '../../utils/embedBuilder.js';
import pool from '../../database/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to kick')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the kick')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const target = interaction.options.getMember('target');
            const reason = interaction.options.getString('reason') || 'No reason provided';

            // Validations
            if (!target) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'User tidak ditemukan di server ini.')],
                    ephemeral: true
                });
            }

            if (target.id === interaction.user.id) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'Anda tidak bisa kick diri sendiri.')],
                    ephemeral: true
                });
            }

            if (target.id === interaction.client.user.id) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'Saya tidak bisa kick diri saya sendiri.')],
                    ephemeral: true
                });
            }

            // Check role hierarchy
            if (!canModerate(interaction.member, target)) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'Anda tidak bisa kick member dengan role yang lebih tinggi atau sama dengan Anda.')],
                    ephemeral: true
                });
            }

            // Check if bot can kick
            if (!target.kickable) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'Saya tidak bisa kick member ini. Role mereka mungkin lebih tinggi dari role saya.')],
                    ephemeral: true
                });
            }

            // Send DM to target before kicking
            try {
                await target.send(`Anda telah di-kick dari **${interaction.guild.name}**\n**Alasan:** ${reason}\n**Moderator:** ${interaction.user.tag}`);
            } catch (error) {
                // User has DMs disabled
                console.log('Could not send DM to kicked user');
            }

            // Kick the member
            await target.kick(reason);

            // Log to database
            await logModAction(
                'kick',
                target.id,
                target.user.tag,
                interaction.user.id,
                interaction.user.tag,
                interaction.guild.id,
                reason
            );

            // Send confirmation to moderator
            await interaction.reply({
                embeds: [createSuccessEmbed(
                    'Member Kicked',
                    `${target.user.tag} telah di-kick dari server.\n**Alasan:** ${reason}`
                )]
            });

            // Log to mod channel
            await logToModChannel(interaction, target, reason);

        } catch (error) {
            console.error('Error in kick command:', error);

            const errorEmbed = createErrorEmbed(
                'Error',
                'Terjadi kesalahan saat melakukan kick. Pastikan bot memiliki permission yang cukup.'
            );

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};

async function logToModChannel(interaction, target, reason) {
    try {
        const [rows] = await pool.query(
            'SELECT mod_log_channel FROM guild_config WHERE guild_id = ?',
            [interaction.guild.id]
        );

        if (!rows || rows.length === 0 || !rows[0].mod_log_channel) return;

        const channel = interaction.guild.channels.cache.get(rows[0].mod_log_channel);
        if (!channel) return;

        const embed = createModActionEmbed(
            'kick',
            target.user,
            interaction.user,
            reason
        );

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error logging to mod channel:', error);
    }
}
