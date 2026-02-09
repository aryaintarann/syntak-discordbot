import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import FeatureManager from '../../utils/featureManager.js';
import { colors } from '../../utils/embedBuilder.js';

export default {
    data: new SlashCommandBuilder()
        .setName('roleall')
        .setDescription('Beri atau hapus role dari semua member')
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Beri role ke semua member')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role yang akan diberikan')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('bots')
                        .setDescription('Termasuk bots?')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Hapus role dari semua member')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role yang akan dihapus')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('bots')
                        .setDescription('Termasuk bots?')
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Check if feature is enabled
        const isEnabled = await FeatureManager.isEnabled(interaction.guildId, 'moderation', 'roleall');
        if (!isEnabled) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Fitur Dinonaktifkan')
                    .setDescription('Command `/roleall` tidak diaktifkan di server ini.\nAdmin dapat mengaktifkannya di Dashboard.')],
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const role = interaction.options.getRole('role');
        const includeBots = interaction.options.getBoolean('bots') ?? false;

        // Check role hierarchy
        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Role Terlalu Tinggi')
                    .setDescription('Bot tidak dapat mengatur role yang sama atau lebih tinggi dari role bot.')],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            // Fetch all members
            const members = await interaction.guild.members.fetch();

            let filtered = members.filter(m => {
                if (!includeBots && m.user.bot) return false;

                if (subcommand === 'add') {
                    return !m.roles.cache.has(role.id);
                } else {
                    return m.roles.cache.has(role.id);
                }
            });

            const total = filtered.size;
            let success = 0;
            let failed = 0;

            // Update progress embed
            const progressEmbed = new EmbedBuilder()
                .setColor(colors.info)
                .setTitle(subcommand === 'add' ? '➕ Menambahkan Role...' : '➖ Menghapus Role...')
                .setDescription(`Processing 0/${total} members...`);
            await interaction.editReply({ embeds: [progressEmbed] });

            // Process in batches
            const memberArray = [...filtered.values()];
            for (let i = 0; i < memberArray.length; i++) {
                const member = memberArray[i];
                try {
                    if (subcommand === 'add') {
                        await member.roles.add(role);
                    } else {
                        await member.roles.remove(role);
                    }
                    success++;
                } catch (e) {
                    failed++;
                }

                // Update progress every 10 members
                if ((i + 1) % 10 === 0 || i === memberArray.length - 1) {
                    progressEmbed.setDescription(`Processing ${i + 1}/${total} members...\n✅ Success: ${success} | ❌ Failed: ${failed}`);
                    await interaction.editReply({ embeds: [progressEmbed] }).catch(() => { });
                }

                // Rate limit delay
                if ((i + 1) % 5 === 0) {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            // Final result
            const finalEmbed = new EmbedBuilder()
                .setColor(colors.success)
                .setTitle(subcommand === 'add' ? '✅ Role Ditambahkan' : '✅ Role Dihapus')
                .setDescription(`Selesai memproses ${total} members.`)
                .addFields(
                    { name: 'Role', value: `${role}`, inline: true },
                    { name: 'Success', value: `${success}`, inline: true },
                    { name: 'Failed', value: `${failed}`, inline: true }
                );

            // Log the action
            await FeatureManager.logModAction({
                guildId: interaction.guildId,
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                userId: role.id,
                userTag: role.name,
                actionType: 'roleall',
                reason: `${subcommand === 'add' ? 'Added' : 'Removed'} role ${role.name} to/from ${success} members`
            });

            await interaction.editReply({ embeds: [finalEmbed] });

        } catch (error) {
            console.error('Error in roleall command:', error);
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Error')
                    .setDescription('Terjadi kesalahan saat memproses command.')]
            });
        }
    }
};
