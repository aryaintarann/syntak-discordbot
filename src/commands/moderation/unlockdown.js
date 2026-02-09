import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { disableLockdown } from '../../antiraid/lockdown.js';
import { createErrorEmbed, createLockdownEmbed } from '../../utils/embedBuilder.js';
import pool from '../../database/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unlockdown')
        .setDescription('Remove lockdown from the server or a specific channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Specific channel to unlock (leave empty for server-wide)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for unlocking')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const channel = interaction.options.getChannel('channel');
            const reason = interaction.options.getString('reason') || 'Lockdown lifted by admin';

            // Defer reply
            await interaction.deferReply();

            let results;

            if (channel) {
                // Unlock specific channel
                const { unlockChannel } = await import('../../antiraid/lockdown.js');
                const success = await unlockChannel(channel, reason);

                if (success) {
                    results = { success: [channel.name], failed: [] };
                } else {
                    results = { success: [], failed: [channel.name] };
                }
            } else {
                // Unlock entire server
                results = await disableLockdown(interaction.guild, {
                    reason,
                    moderator: interaction.user
                });
            }

            // Create response
            let message = channel
                ? `🔓 **Channel Unlocked**\n${channel.name} telah dibuka kembali.`
                : `🔓 **Lockdown Lifted**\n${results.success.length} channels telah dibuka kembali.`;

            if (results.failed.length > 0) {
                message += `\n\n⚠️ Gagal membuka ${results.failed.length} channels: ${results.failed.join(', ')}`;
            }

            message += `\n\n**Moderator:** ${interaction.user.tag}\n**Alasan:** ${reason}`;

            await interaction.editReply({ content: message });

            // Log to mod channel
            await logToModChannel(interaction, channel, reason, false);

        } catch (error) {
            console.error('Error in unlockdown command:', error);

            const errorEmbed = createErrorEmbed(
                'Error',
                'Terjadi kesalahan saat melakukan unlockdown.'
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
