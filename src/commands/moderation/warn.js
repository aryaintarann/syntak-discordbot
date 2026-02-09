import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { canModerate } from '../../utils/permissions.js';
import { addWarning, getWarningCount } from '../../database/models/Warning.js';
import { colors } from '../../utils/embedBuilder.js';
import FeatureManager from '../../utils/featureManager.js';
import pool from '../../database/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Issue a warning to a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to warn')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(true)
        ),

    async execute(interaction) {
        try {
            const target = interaction.options.getMember('target');
            const reason = interaction.options.getString('reason');

            // Validations
            if (!target) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('User tidak ditemukan di server ini.')],
                    ephemeral: true
                });
            }

            if (target.id === interaction.user.id) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('Anda tidak bisa warn diri sendiri.')],
                    ephemeral: true
                });
            }

            if (target.user.bot) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('Anda tidak bisa warn bot.')],
                    ephemeral: true
                });
            }

            // Check role hierarchy
            if (!canModerate(interaction.member, target)) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('Anda tidak bisa warn member dengan role yang lebih tinggi.')],
                    ephemeral: true
                });
            }

            // Add warning to database
            await addWarning(
                target.id,
                interaction.guild.id,
                interaction.user.id,
                reason
            );

            const warningCount = await getWarningCount(target.id, interaction.guild.id);

            // Log action using FeatureManager
            const caseNumber = await FeatureManager.logModAction({
                guildId: interaction.guildId,
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                userId: target.id,
                userTag: target.user.tag,
                actionType: 'warn',
                reason,
                extraData: { warningNumber: warningCount }
            });

            // Send DM to target
            try {
                await target.send({
                    embeds: [new EmbedBuilder()
                        .setColor(colors.warn)
                        .setTitle(`⚠️ You received a Warning in ${interaction.guild.name}`)
                        .addFields(
                            { name: 'Reason', value: reason, inline: false },
                            { name: 'Moderator', value: interaction.user.tag, inline: true },
                            { name: 'Total Warnings', value: `${warningCount}`, inline: true }
                        )
                    ]
                });
            } catch (error) {
                // Ignore DM errors
            }

            // Send confirmation
            const embed = new EmbedBuilder()
                .setColor(colors.warn)
                .setTitle('⚠️ Warning Issued')
                .setDescription(`${target.user.tag} telah menerima warning.`)
                .addFields(
                    { name: 'Target', value: target.user.tag, inline: true },
                    { name: 'Case', value: `#${caseNumber}`, inline: true },
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Total Warnings', value: `${warningCount}`, inline: true }
                );

            // Check if auto-action should be triggered
            const [configRows] = await pool.query(
                'SELECT max_warnings, auto_action FROM guild_config WHERE guild_id = ?',
                [interaction.guild.id]
            );

            if (configRows && configRows.length > 0) {
                const { max_warnings, auto_action } = configRows[0];

                if (warningCount >= max_warnings && max_warnings > 0) {
                    // Execute auto-action
                    try {
                        if (auto_action === 'timeout' && target.moderatable) {
                            await target.timeout(600000, `Reached ${max_warnings} warnings`); // 10 min
                            embed.addFields({ name: '🔨 Auto-Action', value: `Timeout 10m (reached ${max_warnings} warnings)` });
                        } else if (auto_action === 'kick' && target.kickable) {
                            await target.kick(`Reached ${max_warnings} warnings`);
                            embed.addFields({ name: '🔨 Auto-Action', value: `Kick (reached ${max_warnings} warnings)` });
                        } else if (auto_action === 'ban' && target.bannable) {
                            await target.ban({ reason: `Reached ${max_warnings} warnings` });
                            embed.addFields({ name: '🔨 Auto-Action', value: `Ban (reached ${max_warnings} warnings)` });
                        }
                    } catch (error) {
                        console.error('Failed to execute auto-action:', error);
                    }
                }
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in warn command:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Error').setDescription('Terjadi kesalahan saat memberikan warning.')],
                ephemeral: true
            });
        }
    }
};
