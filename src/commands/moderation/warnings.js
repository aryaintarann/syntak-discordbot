import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { getWarnings } from '../../database/models/Warning.js';
import { createErrorEmbed, createInfoEmbed } from '../../utils/embedBuilder.js';

export default {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('View warnings for a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to check warnings for')
                .setRequired(true)
        ),

    async execute(interaction) {
        try {
            const target = interaction.options.getUser('target');

            if (!target) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'User tidak ditemukan.')],
                    ephemeral: true
                });
            }

            // Get warnings from database
            const warnings = await getWarnings(target.id, interaction.guild.id);

            if (warnings.length === 0) {
                return interaction.reply({
                    embeds: [createInfoEmbed(
                        '📋 Warnings',
                        `${target.tag} tidak memiliki warning.`
                    )],
                    ephemeral: true
                });
            }

            // Create embed with warnings
            const embed = new EmbedBuilder()
                .setColor(0xFFFF00)
                .setTitle(`⚠️ Warnings untuk ${target.tag}`)
                .setThumbnail(target.displayAvatarURL())
                .setDescription(`Total warnings: **${warnings.length}**`)
                .setTimestamp();

            // Add warnings as fields (max 25 fields)
            const maxFields = Math.min(warnings.length, 25);

            for (let i = 0; i < maxFields; i++) {
                const warning = warnings[i];
                const date = new Date(warning.timestamp);
                const moderator = await interaction.client.users.fetch(warning.moderator_id).catch(() => null);

                embed.addFields({
                    name: `Warning #${i + 1} - ${date.toLocaleDateString()}`,
                    value: `**Moderator:** ${moderator ? moderator.tag : 'Unknown'}\n**Reason:** ${warning.reason}`,
                    inline: false
                });
            }

            if (warnings.length > 25) {
                embed.setFooter({ text: `Showing 25 of ${warnings.length} warnings` });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('Error in warnings command:', error);

            const errorEmbed = createErrorEmbed(
                'Error',
                'Terjadi kesalahan saat mengambil warnings.'
            );

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
