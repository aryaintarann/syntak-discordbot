import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Guild, Warning } from '../../database/index.js';
import config from '../../config/config.js';
import logger from '../../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a member')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The member to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for warning')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const member = interaction.guild.members.cache.get(target.id);

        if (!member) {
            return interaction.reply({
                content: '❌ User tidak ditemukan di server ini!',
                ephemeral: true
            });
        }

        if (member.id === interaction.user.id) {
            return interaction.reply({
                content: '❌ Kamu tidak bisa warn dirimu sendiri!',
                ephemeral: true
            });
        }

        try {
            // Create warning in database
            const warning = await Warning.create({
                userId: target.id,
                guildId: interaction.guild.id,
                moderatorId: interaction.user.id,
                reason: reason
            });

            // Get total warnings
            const totalWarnings = await Warning.count({
                where: {
                    userId: target.id,
                    guildId: interaction.guild.id,
                    active: true
                }
            });

            // Send DM to user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(config.colors.warning)
                    .setTitle('⚠️ You have been warned')
                    .setDescription(`You have been warned in **${interaction.guild.name}**`)
                    .addFields(
                        { name: 'Reason', value: reason },
                        { name: 'Moderator', value: interaction.user.tag },
                        { name: 'Total Warnings', value: totalWarnings.toString() }
                    )
                    .setFooter({ text: 'Please follow the server rules to avoid further action.' })
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                logger.debug('Could not send DM to user');
            }

            // Log to mod logs
            const guildData = await Guild.findByPk(interaction.guild.id);
            if (guildData?.modLogChannelId) {
                try {
                    const logChannel = await interaction.guild.channels.fetch(guildData.modLogChannelId);
                    const logEmbed = new EmbedBuilder()
                        .setColor(config.colors.warning)
                        .setTitle('⚠️ Member Warned')
                        .setThumbnail(target.displayAvatarURL())
                        .addFields(
                            { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                            { name: 'Moderator', value: interaction.user.tag, inline: true },
                            { name: 'Total Warnings', value: totalWarnings.toString(), inline: true },
                            { name: 'Reason', value: reason },
                            { name: 'Warning ID', value: warning.id.toString() }
                        )
                        .setTimestamp();

                    await logChannel.send({ embeds: [logEmbed] });
                } catch (error) {
                    logger.error('Error sending to mod log:', error);
                }
            }

            // Reply to command
            const embed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription(
                    `✅ **${target.tag}** telah diberikan warning!\n` +
                    `**Reason:** ${reason}\n` +
                    `**Total Warnings:** ${totalWarnings}`
                );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            logger.error('Error warning member:', error);
            await interaction.reply({
                content: '❌ Terjadi error saat warn member!',
                ephemeral: true
            });
        }
    },

    cooldown: 3
};
