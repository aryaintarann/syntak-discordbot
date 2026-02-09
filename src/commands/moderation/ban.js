import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { canModerate } from '../../utils/permissions.js';
import { colors } from '../../utils/embedBuilder.js';
import FeatureManager from '../../utils/featureManager.js';

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
        // Check if feature is enabled
        const isEnabled = await FeatureManager.isEnabled(interaction.guildId, 'moderation', 'ban');
        // Note: 'ban' might not be in the initial feature list locally, but it should be treated as core. 
        // If not in feature list, we might want to skip this check or add it to features.
        // For now detecting if it IS in features. If not, default to true or skip check.
        // Actually, FeatureManager.isEnabled defaults to false if not found unless we handle defaults well.
        // Let's assume we want to enforce it if it exists in the toggle list.
        // In the FeaturesPage, we didn't add 'ban' explicitly, only 'purge', 'slowmode', 'mute', etc.
        // Let's add 'ban', 'kick', 'timeout', 'warn' to the feature list in a future update.
        // For now, let's NOT check FeatureManager for ban/kick to avoid disabling them accidentally if not in config.
        // OR better: add them to the default config in FeatureManager.js (I can't edit that right now easily without check).
        // Safest approach: Just implementation logging changes.

        try {
            const target = interaction.options.getUser('target');
            const member = interaction.options.getMember('target');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            const deleteDays = interaction.options.getInteger('delete_days') || 0;

            // Validations
            if (!target) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('User tidak ditemukan.')],
                    ephemeral: true
                });
            }

            if (target.id === interaction.user.id) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('Anda tidak bisa ban diri sendiri.')],
                    ephemeral: true
                });
            }

            if (target.id === interaction.client.user.id) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('Saya tidak bisa ban diri saya sendiri.')],
                    ephemeral: true
                });
            }

            // Check role hierarchy (if member is in guild)
            if (member && !canModerate(interaction.member, member)) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('Anda tidak bisa ban member dengan role yang lebih tinggi atau sama dengan Anda.')],
                    ephemeral: true
                });
            }

            // Check if member is bannable (if in guild)
            if (member && !member.bannable) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('Saya tidak bisa ban member ini. Role mereka mungkin lebih tinggi dari role saya.')],
                    ephemeral: true
                });
            }

            // Send DM to target before banning
            try {
                await target.send({
                    embeds: [new EmbedBuilder()
                        .setColor(colors.error)
                        .setTitle(`🔨 You have been Banned from ${interaction.guild.name}`)
                        .addFields(
                            { name: 'Reason', value: reason },
                            { name: 'Moderator', value: interaction.user.tag }
                        )
                    ]
                });
            } catch (error) {
                // Ignore DM errors
            }

            // Ban the user
            await interaction.guild.members.ban(target, {
                deleteMessageSeconds: deleteDays * 24 * 60 * 60,
                reason
            });

            // Log action using FeatureManager (saves to DB and returns case ID)
            const caseNumber = await FeatureManager.logModAction({
                guildId: interaction.guildId,
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                userId: target.id,
                userTag: target.tag,
                actionType: 'ban',
                reason,
                duration: null // Partial support for deleteDays? Store in reason maybe? or extends schema.
            });

            // Send confirmation
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.success)
                    .setTitle('🔨 User Banned')
                    .setDescription(`${target.tag} telah di-ban dari server.`)
                    .addFields(
                        { name: 'Target', value: target.tag, inline: true },
                        { name: 'Case', value: `#${caseNumber}`, inline: true },
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Deleted Msgs', value: `${deleteDays} days`, inline: true }
                    )]
            });

        } catch (error) {
            console.error('Error in ban command:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Error')
                    .setDescription('Terjadi kesalahan saat melakukan ban.')],
                ephemeral: true
            });
        }
    }
};
