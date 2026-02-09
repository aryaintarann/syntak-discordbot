import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { colors } from '../../utils/embedBuilder.js';
import FeatureManager from '../../utils/featureManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a member from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(option =>
            option
                .setName('userid')
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
            const userId = interaction.options.getString('userid');
            const reason = interaction.options.getString('reason') || 'No reason provided';

            // Unban the user
            try {
                await interaction.guild.members.unban(userId, reason);
            } catch (error) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('User tidak ditemukan atau tidak sedang di-ban.')],
                    ephemeral: true
                });
            }

            // Get user info for logging
            const user = await interaction.client.users.fetch(userId).catch(() => ({ id: userId, tag: 'Unknown User' }));

            // Log action using FeatureManager
            const caseNumber = await FeatureManager.logModAction({
                guildId: interaction.guildId,
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                userId: userId,
                userTag: user.tag,
                actionType: 'unban',
                reason
            });

            // Send confirmation
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.success)
                    .setTitle('✅ User Unbanned')
                    .setDescription(`User dengan ID ${userId} telah di-unban.`)
                    .addFields(
                        { name: 'Target', value: `<@${userId}>`, inline: true },
                        { name: 'Case', value: `#${caseNumber}`, inline: true },
                        { name: 'Reason', value: reason, inline: false }
                    )]
            });

        } catch (error) {
            console.error('Error in unban command:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Error')
                    .setDescription('Terjadi kesalahan saat melakukan unban.')],
                ephemeral: true
            });
        }
    }
};
