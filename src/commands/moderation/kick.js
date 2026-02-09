import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { canModerate } from '../../utils/permissions.js';
import { colors } from '../../utils/embedBuilder.js';
import FeatureManager from '../../utils/featureManager.js';

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
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('User tidak ditemukan di server ini.')],
                    ephemeral: true
                });
            }

            if (target.id === interaction.user.id) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('Anda tidak bisa kick diri sendiri.')],
                    ephemeral: true
                });
            }

            if (target.id === interaction.client.user.id) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('Saya tidak bisa kick diri saya sendiri.')],
                    ephemeral: true
                });
            }

            // Check role hierarchy
            if (!canModerate(interaction.member, target)) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('Anda tidak bisa kick member dengan role yang lebih tinggi atau sama dengan Anda.')],
                    ephemeral: true
                });
            }

            // Check if bot can kick
            if (!target.kickable) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('Saya tidak bisa kick member ini. Role mereka mungkin lebih tinggi dari role saya.')],
                    ephemeral: true
                });
            }

            // Send DM to target before kicking
            try {
                await target.send({
                    embeds: [new EmbedBuilder()
                        .setColor(colors.error)
                        .setTitle(`👢 You have been Kicked from ${interaction.guild.name}`)
                        .addFields(
                            { name: 'Reason', value: reason },
                            { name: 'Moderator', value: interaction.user.tag }
                        )
                    ]
                });
            } catch (error) {
                // Ignore DM errors
            }

            // Kick the member
            await target.kick(reason);

            // Log action using FeatureManager
            const caseNumber = await FeatureManager.logModAction({
                guildId: interaction.guildId,
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                userId: target.id,
                userTag: target.user.tag,
                actionType: 'kick',
                reason
            });

            // Send confirmation
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.success)
                    .setTitle('👢 User Kicked')
                    .setDescription(`${target.user.tag} telah di-kick dari server.`)
                    .addFields(
                        { name: 'Target', value: target.user.tag, inline: true },
                        { name: 'Case', value: `#${caseNumber}`, inline: true },
                        { name: 'Reason', value: reason, inline: false }
                    )]
            });

        } catch (error) {
            console.error('Error in kick command:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Error')
                    .setDescription('Terjadi kesalahan saat melakukan kick.')],
                ephemeral: true
            });
        }
    }
};
