import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { setModLogChannel } from '../../database/models/GuildConfig.js';
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embedBuilder.js';

export default {
    data: new SlashCommandBuilder()
        .setName('setmodlog')
        .setDescription('Set the mod log channel for this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel to use for mod logs')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    async execute(interaction) {
        try {
            const channel = interaction.options.getChannel('channel');

            // Set mod log channel in database
            await setModLogChannel(interaction.guild.id, channel.id);

            await interaction.reply({
                embeds: [createSuccessEmbed(
                    'Mod Log Channel Set',
                    `Mod log channel telah diset ke ${channel}\n\nSemua moderation actions dan auto-mod violations akan dilog ke channel ini.`
                )],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error in setmodlog command:', error);

            await interaction.reply({
                embeds: [createErrorEmbed('Error', 'Terjadi kesalahan saat setting mod log channel.')],
                ephemeral: true
            });
        }
    }
};
