import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { canModerate } from '../../utils/permissions.js';
import { addWarning, getWarningCount } from '../../database/models/Warning.js';
import { logModAction } from '../../database/models/ModLog.js';
import { createWarningEmbed, createErrorEmbed, createSuccessEmbed } from '../../utils/embedBuilder.js';
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
                    embeds: [createErrorEmbed('Error', 'User tidak ditemukan di server ini.')],
                    ephemeral: true
                });
            }

            if (target.id === interaction.user.id) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'Anda tidak bisa warn diri sendiri.')],
                    ephemeral: true
                });
            }

            if (target.user.bot) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'Anda tidak bisa warn bot.')],
                    ephemeral: true
                });
            }

            // Check role hierarchy
            if (!canModerate(interaction.member, target)) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'Anda tidak bisa warn member dengan role yang lebih tinggi.')],
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

            // Log to database
            await logModAction(
                'warn',
                target.id,
                target.user.tag,
                interaction.user.id,
                interaction.user.tag,
                interaction.guild.id,
                reason,
                { warningNumber: warningCount }
            );

            // Send DM to target
            try {
                await target.send(`⚠️ Anda menerima **warning** di **${interaction.guild.name}**\n**Alasan:** ${reason}\n**Moderator:** ${interaction.user.tag}\n**Total Warnings:** ${warningCount}`);
            } catch (error) {
                console.log('Could not send DM');
            }

            // Send confirmation
            const embed = createSuccessEmbed(
                'Warning Issued',
                `${target.user.tag} telah menerima warning.\n**Alasan:** ${reason}\n**Total Warnings:** ${warningCount}`
            );

            // Check if auto-action should be triggered
            const [configRows] = await pool.query(
                'SELECT max_warnings, auto_action FROM guild_config WHERE guild_id = ?',
                [interaction.guild.id]
            );

            if (configRows && configRows.length > 0) {
                const { max_warnings, auto_action } = configRows[0];

                if (warningCount >= max_warnings) {
                    // Execute auto-action
                    try {
                        if (auto_action === 'timeout' && target.moderatable) {
                            await target.timeout(600000, `Reached ${max_warnings} warnings`); // 10 min
                            embed.addFields({ name: '🔨 Auto-Action', value: `Member di-timeout 10 menit (mencapai ${max_warnings} warnings)` });
                        } else if (auto_action === 'kick' && target.kickable) {
                            await target.kick(`Reached ${max_warnings} warnings`);
                            embed.addFields({ name: '🔨 Auto-Action', value: `Member di-kick (mencapai ${max_warnings} warnings)` });
                        }
                    } catch (error) {
                        console.error('Failed to execute auto-action:', error);
                    }
                }
            }

            await interaction.reply({ embeds: [embed] });

            // Log to mod channel
            await logToModChannel(interaction, target, reason, warningCount);

        } catch (error) {
            console.error('Error in warn command:', error);

            const errorEmbed = createErrorEmbed(
                'Error',
                'Terjadi kesalahan saat memberikan warning.'
            );

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};

async function logToModChannel(interaction, target, reason, warningCount) {
    try {
        const [rows] = await pool.query(
            'SELECT mod_log_channel FROM guild_config WHERE guild_id = ?',
            [interaction.guild.id]
        );

        if (!rows || rows.length === 0 || !rows[0].mod_log_channel) return;

        const channel = interaction.guild.channels.cache.get(rows[0].mod_log_channel);
        if (!channel) return;

        const embed = createWarningEmbed(
            target.user,
            interaction.user,
            reason,
            warningCount
        );

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error logging to mod channel:', error);
    }
}
