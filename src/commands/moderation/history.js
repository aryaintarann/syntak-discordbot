import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import FeatureManager from '../../utils/featureManager.js';
import { colors } from '../../utils/embedBuilder.js';
import pool from '../../database/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('Lihat riwayat moderasi user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User yang ingin dilihat riwayatnya')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        // Check if feature is enabled
        const isEnabled = await FeatureManager.isEnabled(interaction.guildId, 'moderation', 'history');
        if (!isEnabled) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Fitur Dinonaktifkan')
                    .setDescription('Command `/history` tidak diaktifkan di server ini.\nAdmin dapat mengaktifkannya di Dashboard.')],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user');

        try {
            // Get mod cases
            const [cases] = await pool.query(
                `SELECT * FROM mod_cases 
                 WHERE guild_id = ? AND user_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT 10`,
                [interaction.guildId, targetUser.id]
            );

            // Get warnings
            const [warnings] = await pool.query(
                `SELECT * FROM warnings 
                 WHERE guild_id = ? AND user_id = ? 
                 ORDER BY timestamp DESC 
                 LIMIT 5`,
                [interaction.guildId, targetUser.id]
            );

            // Get notes
            const [notes] = await pool.query(
                `SELECT * FROM user_notes 
                 WHERE guild_id = ? AND user_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT 5`,
                [interaction.guildId, targetUser.id]
            );

            // Build embed fields
            const fields = [];

            // Summary
            const actionCounts = {};
            cases.forEach(c => {
                actionCounts[c.action_type] = (actionCounts[c.action_type] || 0) + 1;
            });

            const summaryParts = [];
            if (actionCounts.warn) summaryParts.push(`⚠️ ${actionCounts.warn} warnings`);
            if (actionCounts.mute) summaryParts.push(`🔇 ${actionCounts.mute} mutes`);
            if (actionCounts.timeout) summaryParts.push(`⏰ ${actionCounts.timeout} timeouts`);
            if (actionCounts.kick) summaryParts.push(`👢 ${actionCounts.kick} kicks`);
            if (actionCounts.ban) summaryParts.push(`🔨 ${actionCounts.ban} bans`);

            if (summaryParts.length > 0) {
                fields.push({
                    name: '📊 Summary',
                    value: summaryParts.join(' • '),
                    inline: false
                });
            }

            // Recent cases
            if (cases.length > 0) {
                const recentCases = cases.slice(0, 5).map(c => {
                    const date = new Date(c.created_at).toLocaleDateString('id-ID');
                    const icon = getActionIcon(c.action_type);
                    return `${icon} **#${c.case_number}** ${c.action_type} - ${date}\n   └ ${c.reason || 'No reason'}`;
                }).join('\n');

                fields.push({
                    name: '📋 Recent Cases',
                    value: recentCases,
                    inline: false
                });
            }

            // Notes
            if (notes.length > 0) {
                const notesList = notes.slice(0, 3).map(n => {
                    const date = new Date(n.created_at).toLocaleDateString('id-ID');
                    return `📝 ${n.note.substring(0, 100)}${n.note.length > 100 ? '...' : ''}\n   └ by ${n.moderator_tag} - ${date}`;
                }).join('\n');

                fields.push({
                    name: '📝 Notes',
                    value: notesList,
                    inline: false
                });
            }

            const embed = new EmbedBuilder()
                .setColor(cases.length === 0 ? colors.success : colors.warn)
                .setTitle(`📜 Riwayat Moderasi`)
                .setDescription(cases.length === 0 && notes.length === 0
                    ? `${targetUser} tidak memiliki riwayat moderasi.`
                    : `Menampilkan riwayat untuk ${targetUser}`)
                .setThumbnail(targetUser.displayAvatarURL());

            if (fields.length > 0) {
                embed.addFields(fields);
            }

            // Add footer with total counts
            if (cases.length > 0 || notes.length > 0) {
                embed.setFooter({ text: `Total: ${cases.length} cases • ${notes.length} notes • ${warnings.length} warnings` });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in history command:', error);
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Error')
                    .setDescription('Tidak dapat mengambil riwayat user.')]
            });
        }
    }
};

function getActionIcon(action) {
    const icons = {
        warn: '⚠️',
        mute: '🔇',
        unmute: '🔊',
        timeout: '⏰',
        kick: '👢',
        ban: '🔨',
        unban: '✅',
        note: '📝',
        purge: '🗑️'
    };
    return icons[action] || '📌';
}
