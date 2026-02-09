import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { canModerate } from '../../utils/permissions.js';
import { colors } from '../../utils/embedBuilder.js';
import { parseTime, formatTime, validateTimeoutDuration } from '../../utils/timeParser.js';
import { trackTimeout } from '../../utils/timeoutTracker.js';
import FeatureManager from '../../utils/featureManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout (mute) a member for a specified duration')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to timeout')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('duration')
                .setDescription('Duration (e.g., 5m, 1h, 30 = 30 minutes)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the timeout')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const target = interaction.options.getMember('target');
            const durationString = interaction.options.getString('duration');
            const reason = interaction.options.getString('reason') || 'No reason provided';

            // Validations
            if (!target) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('User tidak ditemukan di server ini.')]
                });
            }

            if (target.id === interaction.user.id) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('Anda tidak bisa timeout diri sendiri.')]
                });
            }

            if (target.id === interaction.client.user.id) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('Saya tidak bisa timeout diri saya sendiri.')]
                });
            }

            // Check role hierarchy
            if (!canModerate(interaction.member, target)) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('Anda tidak bisa timeout member dengan role yang lebih tinggi.')]
                });
            }

            // Parse duration
            let duration;
            try {
                duration = parseTime(durationString);
                validateTimeoutDuration(duration);
            } catch (error) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription(error.message)]
                });
            }

            // Check if bot can moderate
            if (!target.moderatable) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('Saya tidak bisa timeout member ini. Role mereka mungkin lebih tinggi dari role saya.')]
                });
            }

            // Send DM to target
            try {
                await target.send({
                    embeds: [new EmbedBuilder()
                        .setColor(colors.warn)
                        .setTitle(`⏰ You have been Timed Out in ${interaction.guild.name}`)
                        .addFields(
                            { name: 'Duration', value: formatTime(duration), inline: true },
                            { name: 'Reason', value: reason, inline: true },
                            { name: 'Moderator', value: interaction.user.tag, inline: false }
                        )
                    ]
                });
            } catch (error) {
                // Ignore DM errors
            }

            // Timeout the member
            await target.timeout(duration, reason);

            // Track timeout for expiry notification
            const expiryTime = Date.now() + duration;
            await trackTimeout(target.id, interaction.guild.id, expiryTime);

            // Log action using FeatureManager
            const caseNumber = await FeatureManager.logModAction({
                guildId: interaction.guildId,
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                userId: target.id,
                userTag: target.user.tag,
                actionType: 'timeout',
                reason,
                duration: Math.floor(duration / 1000)
            });

            // Send confirmation
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.warn)
                    .setTitle('⏰ Member Timed Out')
                    .setDescription(`${target.user.tag} telah di-timeout.`)
                    .addFields(
                        { name: 'Target', value: target.user.tag, inline: true },
                        { name: 'Duration', value: formatTime(duration), inline: true },
                        { name: 'Case', value: `#${caseNumber}`, inline: true },
                        { name: 'Reason', value: reason, inline: false }
                    )]
            });

        } catch (error) {
            console.error('Error in timeout command:', error);
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Error')
                    .setDescription('Terjadi kesalahan saat melakukan timeout.')]
            });
        }
    }
};
