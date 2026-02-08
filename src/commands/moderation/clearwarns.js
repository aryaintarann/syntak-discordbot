import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { clearWarnings, getWarningCount } from '../../database/models/Warning.js';
import { logModAction } from '../../database/models/ModLog.js';
import { createErrorEmbed, createSuccessEmbed } from '../../utils/embedBuilder.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clearwarns')
        .setDescription('Clear all warnings for a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to clear warnings for')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for clearing warnings')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const target = interaction.options.getUser('target');
            const reason = interaction.options.getString('reason') || 'No reason provided';

            if (!target) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'User tidak ditemukan.')],
                    ephemeral: true
                });
            }

            // Get current warning count
            const warningCount = await getWarningCount(target.id, interaction.guild.id);

            if (warningCount === 0) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', `${target.tag} tidak memiliki warning.`)],
                    ephemeral: true
                });
            }

            // Clear warnings
            await clearWarnings(target.id, interaction.guild.id);

            // Log action
            await logModAction(
                'clearwarns',
                target.id,
                target.tag,
                interaction.user.id,
                interaction.user.tag,
                interaction.guild.id,
                reason,
                { clearedCount: warningCount }
            );

            // Send DM to target
            try {
                await target.send(`✅ Semua warnings Anda di **${interaction.guild.name}** telah dihapus.\n**Moderator:** ${interaction.user.tag}\n**Alasan:** ${reason}`);
            } catch (error) {
                console.log('Could not send DM');
            }

            // Send confirmation
            await interaction.reply({
                embeds: [createSuccessEmbed(
                    'Warnings Cleared',
                    `Berhasil menghapus ${warningCount} warning untuk ${target.tag}.\n**Alasan:** ${reason}`
                )]
            });

        } catch (error) {
            console.error('Error in clearwarns command:', error);

            const errorEmbed = createErrorEmbed(
                'Error',
                'Terjadi kesalahan saat menghapus warnings.'
            );

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
