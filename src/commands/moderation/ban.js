import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { canModerate } from '../../utils/permissions.js';
import { logModAction } from '../../database/models/ModLog.js';
import { createModActionEmbed, createErrorEmbed, createSuccessEmbed } from '../../utils/embedBuilder.js';
import pool from '../../database/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to ban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option
                .setName('delete_days')
                .setDescription('Number of days of messages to delete (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const target = interaction.options.getUser('target');
            const member = interaction.options.getMember('target');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            const deleteDays = interaction.options.getInteger('delete_days') || 0;

            // Validations
            if (!target) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'User tidak ditemukan.')],
                    ephemeral: true
                });
            }

            if (target.id === interaction.user.id) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'Anda tidak bisa ban diri sendiri.')],
                    ephemeral: true
                });
            }

            if (target.id === interaction.client.user.id) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'Saya tidak bisa ban diri saya sendiri.')],
                    ephemeral: true
                });
            }

            // Check role hierarchy (if member is in guild)
            if (member && !canModerate(interaction.member, member)) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'Anda tidak bisa ban member dengan role yang lebih tinggi atau sama dengan Anda.')],
                    ephemeral: true
                });
            }

            // Check if member is bannable (if in guild)
            if (member && !member.bannable) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'Saya tidak bisa ban member ini. Role mereka mungkin lebih tinggi dari role saya.')],
                    ephemeral: true
                });
            }

            // Send DM to target before banning (if member is in guild)
            if (member) {
                try {
                    await target.send(`Anda telah di-ban dari **${interaction.guild.name}**\n**Alasan:** ${reason}\n**Moderator:** ${interaction.user.tag}`);
                } catch (error) {
                    console.log('Could not send DM to banned user');
                }
            }

            // Ban the user
            await interaction.guild.members.ban(target, {
                deleteMessageSeconds: deleteDays * 24 * 60 * 60,
                reason
            });

            // Log to database
            await logModAction(
                'ban',
                target.id,
                target.tag,
                interaction.user.id,
                interaction.user.tag,
                interaction.guild.id,
                reason,
                { deleteDays }
            );

            // Send confirmation
            await interaction.reply({
                embeds: [createSuccessEmbed(
                    'Member Banned',
                    `${target.tag} telah di-ban dari server.\n**Alasan:** ${reason}${deleteDays > 0 ? `\n**Messages Deleted:** ${deleteDays} hari` : ''}`
                )]
            });

            // Log to mod channel
            await logToModChannel(interaction, target, reason, deleteDays);

        } catch (error) {
            console.error('Error in ban command:', error);

            const errorEmbed = createErrorEmbed(
                'Error',
                'Terjadi kesalahan saat melakukan ban. Pastikan bot memiliki permission yang cukup.'
            );

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};

async function logToModChannel(interaction, target, reason, deleteDays) {
    try {
        const [rows] = await pool.query(
            'SELECT mod_log_channel FROM guild_config WHERE guild_id = ?',
            [interaction.guild.id]
        );

        if (!rows || rows.length === 0 || !rows[0].mod_log_channel) return;

        const channel = interaction.guild.channels.cache.get(rows[0].mod_log_channel);
        if (!channel) return;

        const embed = createModActionEmbed(
            'ban',
            target,
            interaction.user,
            reason,
            deleteDays > 0 ? [{ name: '🗑️ Messages Deleted', value: `${deleteDays} days`, inline: true }] : []
        );

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error logging to mod channel:', error);
    }
}
