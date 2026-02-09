import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } from 'discord.js';
import FeatureManager from '../../utils/featureManager.js';
import { colors } from '../../utils/embedBuilder.js';

export default {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Hapus banyak pesan sekaligus')
        .addIntegerOption(option =>
            option.setName('jumlah')
                .setDescription('Jumlah pesan yang akan dihapus (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Hapus pesan dari user tertentu saja')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('contains')
                .setDescription('Hapus pesan yang mengandung kata tertentu')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        // Check if feature is enabled
        const isEnabled = await FeatureManager.isEnabled(interaction.guildId, 'moderation', 'purge');
        if (!isEnabled) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Fitur Dinonaktifkan')
                    .setDescription('Command `/purge` tidak diaktifkan di server ini.\nAdmin dapat mengaktifkannya di Dashboard.')],
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const amount = interaction.options.getInteger('jumlah');
        const targetUser = interaction.options.getUser('user');
        const contains = interaction.options.getString('contains');

        try {
            // Fetch messages
            let messages = await interaction.channel.messages.fetch({ limit: 100 });

            // Filter messages
            let filtered = messages.filter(msg => {
                // Can't delete messages older than 14 days
                const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
                if (msg.createdTimestamp < twoWeeksAgo) return false;

                // Filter by user if specified
                if (targetUser && msg.author.id !== targetUser.id) return false;

                // Filter by content if specified
                if (contains && !msg.content.toLowerCase().includes(contains.toLowerCase())) return false;

                return true;
            });

            // Limit to requested amount
            filtered = [...filtered.values()].slice(0, amount);

            if (filtered.length === 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(colors.warn)
                        .setTitle('⚠️ Tidak Ada Pesan')
                        .setDescription('Tidak ada pesan yang cocok dengan kriteria untuk dihapus.')]
                });
            }

            // Delete messages
            const deleted = await interaction.channel.bulkDelete(filtered, true);

            // Log the action
            await FeatureManager.logModAction({
                guildId: interaction.guildId,
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                userId: targetUser?.id || 'multiple',
                userTag: targetUser?.tag || 'Multiple Users',
                actionType: 'purge',
                reason: `Deleted ${deleted.size} messages${targetUser ? ` from ${targetUser.tag}` : ''}${contains ? ` containing "${contains}"` : ''}`
            });

            // Send success message
            const embed = new EmbedBuilder()
                .setColor(colors.success)
                .setTitle('🗑️ Pesan Dihapus')
                .setDescription(`Berhasil menghapus **${deleted.size}** pesan.`);

            if (targetUser) embed.addFields({ name: 'User', value: targetUser.tag, inline: true });
            if (contains) embed.addFields({ name: 'Mengandung', value: contains, inline: true });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in purge command:', error);

            let errorMessage = 'Terjadi kesalahan saat menghapus pesan.';
            if (error.code === 50034) {
                errorMessage = 'Tidak dapat menghapus pesan yang lebih dari 14 hari.';
            }

            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Error')
                    .setDescription(errorMessage)]
            });
        }
    }
};
