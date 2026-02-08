import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { getGuildConfig, toggleAutoMod, toggleRaidProtection, updateGuildConfig } from '../../database/models/GuildConfig.js';
import { createSuccessEmbed, createErrorEmbed, createInfoEmbed } from '../../utils/embedBuilder.js';

export default {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configure bot settings for this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current bot configuration')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('automod')
                .setDescription('Toggle auto-moderation')
                .addBooleanOption(option =>
                    option
                        .setName('enabled')
                        .setDescription('Enable or disable auto-moderation')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('raidprotection')
                .setDescription('Toggle raid protection')
                .addBooleanOption(option =>
                    option
                        .setName('enabled')
                        .setDescription('Enable or disable raid protection')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('maxwarnings')
                .setDescription('Set maximum warnings before auto-action')
                .addIntegerOption(option =>
                    option
                        .setName('count')
                        .setDescription('Number of warnings (1-10)')
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('autoaction')
                .setDescription('Set auto-action when max warnings reached')
                .addStringOption(option =>
                    option
                        .setName('action')
                        .setDescription('Action to take')
                        .addChoices(
                            { name: 'Timeout (10 minutes)', value: 'timeout' },
                            { name: 'Kick from server', value: 'kick' },
                            { name: 'None (only warn)', value: 'none' }
                        )
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'view') {
                // View current config
                const config = await getGuildConfig(interaction.guild.id);

                const embed = new EmbedBuilder()
                    .setColor(0x3498DB)
                    .setTitle(`⚙️ Bot Configuration - ${interaction.guild.name}`)
                    .addFields(
                        {
                            name: '🤖 Auto-Moderation',
                            value: config.auto_mod_enabled ? '✅ Enabled' : '❌ Disabled',
                            inline: true
                        },
                        {
                            name: '🛡️ Raid Protection',
                            value: config.raid_protection_enabled ? '✅ Enabled' : '❌ Disabled',
                            inline: true
                        },
                        {
                            name: '📊 Max Warnings',
                            value: `${config.max_warnings} warnings`,
                            inline: true
                        },
                        {
                            name: '🔨 Auto-Action',
                            value: config.auto_action === 'timeout' ? 'Timeout (10 min)' :
                                config.auto_action === 'kick' ? 'Kick' : 'None',
                            inline: true
                        },
                        {
                            name: '📝 Mod Log Channel',
                            value: config.mod_log_channel ? `<#${config.mod_log_channel}>` : 'Not set (use `/setmodlog`)',
                            inline: true
                        }
                    )
                    .setTimestamp()
                    .setFooter({ text: `Server ID: ${interaction.guild.id}` });

                await interaction.reply({ embeds: [embed], ephemeral: true });

            } else if (subcommand === 'automod') {
                const enabled = interaction.options.getBoolean('enabled');
                await toggleAutoMod(interaction.guild.id, enabled);

                await interaction.reply({
                    embeds: [createSuccessEmbed(
                        'Auto-Moderation Updated',
                        `Auto-moderation telah ${enabled ? 'diaktifkan' : 'dinonaktifkan'} untuk server ini.`
                    )],
                    ephemeral: true
                });

            } else if (subcommand === 'raidprotection') {
                const enabled = interaction.options.getBoolean('enabled');
                await toggleRaidProtection(interaction.guild.id, enabled);

                await interaction.reply({
                    embeds: [createSuccessEmbed(
                        'Raid Protection Updated',
                        `Raid protection telah ${enabled ? 'diaktifkan' : 'dinonaktifkan'} untuk server ini.`
                    )],
                    ephemeral: true
                });

            } else if (subcommand === 'maxwarnings') {
                const count = interaction.options.getInteger('count');
                await updateGuildConfig(interaction.guild.id, { max_warnings: count });

                await interaction.reply({
                    embeds: [createSuccessEmbed(
                        'Max Warnings Updated',
                        `Maximum warnings sebelum auto-action telah diset ke ${count}.`
                    )],
                    ephemeral: true
                });

            } else if (subcommand === 'autoaction') {
                const action = interaction.options.getString('action');
                await updateGuildConfig(interaction.guild.id, { auto_action: action });

                const actionText = action === 'timeout' ? 'Timeout (10 minutes)' :
                    action === 'kick' ? 'Kick from server' : 'None (only warn)';

                await interaction.reply({
                    embeds: [createSuccessEmbed(
                        'Auto-Action Updated',
                        `Auto-action saat max warnings tercapai: **${actionText}**`
                    )],
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('Error in config command:', error);

            const errorEmbed = createErrorEmbed(
                'Error',
                'Terjadi kesalahan saat mengupdate konfigurasi.'
            );

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};
