import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { canModerate } from '../../utils/permissions.js';
import { logModAction } from '../../database/models/ModLog.js';
import { createErrorEmbed, createSuccessEmbed } from '../../utils/embedBuilder.js';

export default {
    data: new SlashCommandBuilder()
        .setName('softban')
        .setDescription('Ban and immediately unban a member to delete their messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to softban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the softban')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option
                .setName('delete_days')
                .setDescription('Number of days of messages to delete (1-7)')
                .setMinValue(1)
                .setMaxValue(7)
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const target = interaction.options.getUser('target');
            const member = interaction.options.getMember('target');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            const deleteDays = interaction.options.getInteger('delete_days') || 7;

            // Validations
            if (!member) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'User tidak ditemukan di server ini.')],
                    ephemeral: true
                });
            }

            if (target.id === interaction.user.id) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'Anda tidak bisa softban diri sendiri.')],
                    ephemeral: true
                });
            }

            // Check role hierarchy
            if (!canModerate(interaction.member, member)) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'Anda tidak bisa softban member dengan role yang lebih tinggi.')],
                    ephemeral: true
                });
            }

            if (!member.bannable) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'Saya tidak bisa softban member ini.')],
                    ephemeral: true
                });
            }

            // Defer reply as this might take a moment
            await interaction.deferReply();

            // Send DM
            try {
                await target.send(`Anda telah di-softban dari **${interaction.guild.name}** (messages cleared)\n**Alasan:** ${reason}\n**Moderator:** ${interaction.user.tag}\n\nAnda dapat rejoin server kapan saja.`);
            } catch (error) {
                console.log('Could not send DM');
            }

            // Ban then unban
            await interaction.guild.members.ban(target, {
                deleteMessageSeconds: deleteDays * 24 * 60 * 60,
                reason: `Softban: ${reason}`
            });

            await interaction.guild.members.unban(target.id, 'Softban (auto-unban)');

            // Log to database
            await logModAction(
                'softban',
                target.id,
                target.tag,
                interaction.user.id,
                interaction.user.tag,
                interaction.guild.id,
                reason,
                { deleteDays }
            );

            // Send confirmation
            await interaction.editReply({
                embeds: [createSuccessEmbed(
                    'Member Softbanned',
                    `${target.tag} telah di-softban. Messages mereka telah dihapus dan mereka dapat rejoin server.\n**Alasan:** ${reason}\n**Messages Deleted:** ${deleteDays} hari`
                )]
            });

        } catch (error) {
            console.error('Error in softban command:', error);

            const errorEmbed = createErrorEmbed(
                'Error',
                'Terjadi kesalahan saat melakukan softban.'
            );

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};
