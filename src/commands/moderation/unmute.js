import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import FeatureManager from '../../utils/featureManager.js';
import { colors } from '../../utils/embedBuilder.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmute member')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User yang akan di-unmute')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('alasan')
                .setDescription('Alasan unmute')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        // Check if feature is enabled
        const isEnabled = await FeatureManager.isEnabled(interaction.guildId, 'moderation', 'mute');
        if (!isEnabled) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Fitur Dinonaktifkan')
                    .setDescription('Command `/unmute` tidak diaktifkan di server ini.\nAdmin dapat mengaktifkannya di Dashboard.')],
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('alasan') || 'Tidak ada alasan';

        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ User Tidak Ditemukan')
                    .setDescription('User tersebut tidak ada di server ini.')],
                ephemeral: true
            });
        }

        try {
            // Find muted role
            const mutedRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');

            if (!mutedRole || !member.roles.cache.has(mutedRole.id)) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(colors.warn)
                        .setTitle('⚠️ User Tidak Dimute')
                        .setDescription('User tersebut tidak sedang dimute.')],
                    ephemeral: true
                });
            }

            // Remove muted role
            await member.roles.remove(mutedRole, reason);

            // Log the action
            const caseNumber = await FeatureManager.logModAction({
                guildId: interaction.guildId,
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                userId: member.id,
                userTag: member.user.tag,
                actionType: 'unmute',
                reason
            });

            const embed = new EmbedBuilder()
                .setColor(colors.success)
                .setTitle('🔊 User Diunmute')
                .setDescription(`${member} telah diunmute.`)
                .addFields(
                    { name: 'User', value: `${member.user.tag}`, inline: true },
                    { name: 'Case', value: `#${caseNumber}`, inline: true },
                    { name: 'Alasan', value: reason, inline: false },
                    { name: 'Moderator', value: interaction.user.tag, inline: true }
                );

            await interaction.reply({ embeds: [embed] });

            // DM the user
            try {
                await member.send({
                    embeds: [new EmbedBuilder()
                        .setColor(colors.success)
                        .setTitle('🔊 Anda Diunmute')
                        .setDescription(`Anda telah diunmute di **${interaction.guild.name}**.`)
                        .addFields(
                            { name: 'Alasan', value: reason, inline: false }
                        )]
                });
            } catch (e) {
                // Can't DM user
            }

        } catch (error) {
            console.error('Error in unmute command:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Error')
                    .setDescription('Tidak dapat unmute user. Pastikan bot memiliki permission yang diperlukan.')],
                ephemeral: true
            });
        }
    }
};
