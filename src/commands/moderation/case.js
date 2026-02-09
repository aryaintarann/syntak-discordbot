import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import FeatureManager from '../../utils/featureManager.js';
import { colors } from '../../utils/embedBuilder.js';
import pool from '../../database/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('case')
        .setDescription('Lihat detail case moderasi')
        .addIntegerOption(option =>
            option.setName('nomor')
                .setDescription('Nomor case')
                .setRequired(true)
                .setMinValue(1))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        // Check if feature is enabled
        const isEnabled = await FeatureManager.isEnabled(interaction.guildId, 'moderation', 'case');
        if (!isEnabled) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Fitur Dinonaktifkan')
                    .setDescription('Command `/case` tidak diaktifkan di server ini.\nAdmin dapat mengaktifkannya di Dashboard.')],
                ephemeral: true
            });
        }

        const caseNumber = interaction.options.getInteger('nomor');

        try {
            // Get case
            const [cases] = await pool.query(
                'SELECT * FROM mod_cases WHERE guild_id = ? AND case_number = ?',
                [interaction.guildId, caseNumber]
            );

            if (cases.length === 0) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(colors.error)
                        .setTitle('❌ Case Tidak Ditemukan')
                        .setDescription(`Case #${caseNumber} tidak ditemukan.`)],
                    ephemeral: true
                });
            }

            const caseData = cases[0];
            const actionIcons = {
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

            const icon = actionIcons[caseData.action_type] || '📌';
            const date = new Date(caseData.created_at);

            const fields = [
                { name: 'Action', value: `${icon} ${caseData.action_type.toUpperCase()}`, inline: true },
                { name: 'User', value: caseData.user_tag || `<@${caseData.user_id}>`, inline: true },
                { name: 'Moderator', value: caseData.moderator_tag || `<@${caseData.moderator_id}>`, inline: true },
                { name: 'Reason', value: caseData.reason || 'No reason provided', inline: false },
                { name: 'Date', value: date.toLocaleString('id-ID'), inline: true }
            ];

            if (caseData.duration) {
                const durationText = formatDuration(caseData.duration);
                fields.push({ name: 'Duration', value: durationText, inline: true });
            }

            const embed = new EmbedBuilder()
                .setColor(getActionColor(caseData.action_type))
                .setTitle(`📋 Case #${caseNumber}`)
                .addFields(fields);

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in case command:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Error')
                    .setDescription('Tidak dapat mengambil data case.')],
                ephemeral: true
            });
        }
    }
};

function formatDuration(seconds) {
    if (seconds < 60) return `${seconds} detik`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} menit`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} jam`;
    return `${Math.floor(seconds / 86400)} hari`;
}

function getActionColor(action) {
    const actionColors = {
        warn: colors.warn,
        mute: colors.warn,
        unmute: colors.success,
        timeout: colors.warn,
        kick: colors.error,
        ban: colors.error,
        unban: colors.success,
        note: colors.info
    };
    return actionColors[action] || colors.info;
}
