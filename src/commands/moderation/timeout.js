import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { canModerate } from '../../utils/permissions.js';
import { logModAction } from '../../database/models/ModLog.js';
import { createModActionEmbed, createErrorEmbed, createSuccessEmbed } from '../../utils/embedBuilder.js';
import { parseTime, formatTime, validateTimeoutDuration } from '../../utils/timeParser.js';
import { trackTimeout } from '../../utils/timeoutTracker.js';
import pool from '../../database/database.js';

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
            // Defer reply immediately to prevent timeout
            await interaction.deferReply();

            const target = interaction.options.getMember('target');
            const durationString = interaction.options.getString('duration');
            const reason = interaction.options.getString('reason') || 'No reason provided';

            // Validations
            if (!target) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Error', 'User tidak ditemukan di server ini.')]
                });
            }

            if (target.id === interaction.user.id) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Error', 'Anda tidak bisa timeout diri sendiri.')]
                });
            }

            if (target.id === interaction.client.user.id) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Error', 'Saya tidak bisa timeout diri saya sendiri.')]
                });
            }

            // Check role hierarchy
            if (!canModerate(interaction.member, target)) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Error', 'Anda tidak bisa timeout member dengan role yang lebih tinggi.')]
                });
            }

            // Parse duration
            let duration;
            try {
                duration = parseTime(durationString);
                validateTimeoutDuration(duration);
            } catch (error) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Error', error.message)]
                });
            }

            // Check if bot can moderate
            if (!target.moderatable) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Error', 'Saya tidak bisa timeout member ini. Role mereka mungkin lebih tinggi dari role saya.')]
                });
            }

            // Send DM to target
            try {
                await target.send(`Anda telah di-timeout di **${interaction.guild.name}**\n**Durasi:** ${formatTime(duration)}\n**Alasan:** ${reason}\n**Moderator:** ${interaction.user.tag}`);
            } catch (error) {
                console.log('Could not send DM');
            }

            // Timeout the member
            await target.timeout(duration, reason);

            // Track timeout for expiry notification
            const expiryTime = Date.now() + duration;
            await trackTimeout(target.id, interaction.guild.id, expiryTime);

            // Log to database
            await logModAction(
                'timeout',
                target.id,
                target.user.tag,
                interaction.user.id,
                interaction.user.tag,
                interaction.guild.id,
                reason,
                { duration, formattedDuration: formatTime(duration) }
            );

            // Send confirmation
            await interaction.editReply({
                embeds: [createSuccessEmbed(
                    'Member Timed Out',
                    `${target.user.tag} telah di-timeout selama ${formatTime(duration)}.\n**Alasan:** ${reason}`
                )]
            });

            // Log to mod channel
            await logToModChannel(interaction, target, reason, duration);

        } catch (error) {
            console.error('Error in timeout command:', error);

            const errorEmbed = createErrorEmbed(
                'Error',
                'Terjadi kesalahan saat melakukan timeout.'
            );

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.editReply({ embeds: [errorEmbed] });
            }
        }
    }
};

async function logToModChannel(interaction, target, reason, duration) {
    try {
        const [rows] = await pool.query(
            'SELECT mod_log_channel FROM guild_config WHERE guild_id = ?',
            [interaction.guild.id]
        );

        if (!rows || rows.length === 0 || !rows[0].mod_log_channel) return;

        const channel = interaction.guild.channels.cache.get(rows[0].mod_log_channel);
        if (!channel) return;

        const embed = createModActionEmbed(
            'timeout',
            target.user,
            interaction.user,
            reason,
            [{ name: '⏱️ Duration', value: formatTime(duration), inline: true }]
        );

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error logging to mod channel:', error);
    }
}
