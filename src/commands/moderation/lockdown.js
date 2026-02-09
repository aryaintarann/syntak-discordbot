import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { enableLockdown } from '../../antiraid/lockdown.js';
import { createErrorEmbed, createLockdownEmbed } from '../../utils/embedBuilder.js';
import pool from '../../database/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('lockdown')
        .setDescription('Lock down the server or a specific channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Specific channel to lock (leave empty for server-wide)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for lockdown')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const channel = interaction.options.getChannel('channel');
            const reason = interaction.options.getString('reason') || 'Server lockdown initiated by admin';

            // Defer reply as this might take a moment
            await interaction.deferReply();

            let results;

            if (channel) {
                // Lock specific channel
                const { lockChannel } = await import('../../antiraid/lockdown.js');
                const success = await lockChannel(channel, reason);

                if (success) {
                    results = { success: [channel.name], failed: [] };
                } else {
                    results = { success: [], failed: [channel.name] };
                }
            } else {
                // Lock entire server
                results = await enableLockdown(interaction.guild, {
                    reason,
                    moderator: interaction.user
                });
            }

            // Create response message
            let message = channel
                ? `🔒 **Channel Locked**\n${channel.name} telah dikunci.`
                : `🔒 **Server Lockdown Activated**\n${results.success.length} channels telah dikunci.`;

            if (results.failed.length > 0) {
                message += `\n\n⚠️ Gagal mengunci ${results.failed.length} channels: ${results.failed.join(', ')}`;
            }

            message += `\n\n**Moderator:** ${interaction.user.tag}\n**Alasan:** ${reason}`;

            await interaction.editReply({ content: message });

            // Log to mod channel
            await logToModChannel(interaction, channel, reason, true);

        } catch (error) {
            console.error('Error in lockdown command:', error);

            const errorEmbed = createErrorEmbed(
                'Error',
                'Terjadi kesalahan saat melakukan lockdown. Pastikan bot memiliki permission yang cukup.'
            );

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};

async function logToModChannel(interaction, channel, reason, isLockdown) {
    try {
        const [rows] = await pool.query(
            'SELECT mod_log_channel FROM guild_config WHERE guild_id = ?',
            [interaction.guild.id]
        );

        if (!rows || rows.length === 0 || !rows[0].mod_log_channel) return;

        const logChannel = interaction.guild.channels.cache.get(rows[0].mod_log_channel);
        if (!logChannel) return;

        const embed = createLockdownEmbed(
            isLockdown,
            interaction.user,
            channel ? `Channel: ${channel.name}` : reason
        );

        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error logging to mod channel:', error);
    }
}
