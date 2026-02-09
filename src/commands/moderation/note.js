import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import FeatureManager from '../../utils/featureManager.js';
import { colors } from '../../utils/embedBuilder.js';
import pool from '../../database/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('note')
        .setDescription('Tambah catatan untuk user (hanya terlihat moderator)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User yang ingin ditambah catatan')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('catatan')
                .setDescription('Isi catatan')
                .setRequired(true)
                .setMaxLength(500))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        // Check if feature is enabled
        const isEnabled = await FeatureManager.isEnabled(interaction.guildId, 'moderation', 'note');
        if (!isEnabled) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Fitur Dinonaktifkan')
                    .setDescription('Command `/note` tidak diaktifkan di server ini.\nAdmin dapat mengaktifkannya di Dashboard.')],
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser('user');
        const note = interaction.options.getString('catatan');

        try {
            // Add note to database
            await pool.query(
                `INSERT INTO user_notes (guild_id, user_id, moderator_id, moderator_tag, note) 
                 VALUES (?, ?, ?, ?, ?)`,
                [interaction.guildId, targetUser.id, interaction.user.id, interaction.user.tag, note]
            );

            // Get total notes count
            const [countResult] = await pool.query(
                'SELECT COUNT(*) as count FROM user_notes WHERE guild_id = ? AND user_id = ?',
                [interaction.guildId, targetUser.id]
            );
            const totalNotes = countResult[0].count;

            const embed = new EmbedBuilder()
                .setColor(colors.success)
                .setTitle('📝 Catatan Ditambahkan')
                .setDescription(`Catatan berhasil ditambahkan untuk ${targetUser}.`)
                .addFields(
                    { name: 'User', value: targetUser.tag, inline: true },
                    { name: 'Total Notes', value: `${totalNotes}`, inline: true },
                    { name: 'Catatan', value: note, inline: false },
                    { name: 'Ditambahkan oleh', value: interaction.user.tag, inline: true }
                );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in note command:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Error')
                    .setDescription('Tidak dapat menambahkan catatan.')],
                ephemeral: true
            });
        }
    }
};
