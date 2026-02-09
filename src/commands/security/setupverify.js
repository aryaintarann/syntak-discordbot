import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { colors } from '../../utils/embedBuilder.js';
import FeatureManager from '../../utils/featureManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('setupverify')
        .setDescription('Setup verification system panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Check if verification is enabled in config
        const config = await FeatureManager.getFeatureConfig(interaction.guildId, 'security', 'verification');

        if (!config?.enabled) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(colors.error).setTitle('❌ Feature Disabled').setDescription('Please enable Verification System in Dashboard first.')],
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor(colors.success)
            .setTitle('✅ Server Verification')
            .setDescription('Please click the button below to verify yourself and gain access to the server.')
            .setFooter({ text: 'Syntak Security System' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_user')
                    .setLabel('Verify Me')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: 'Verification panel sent!', ephemeral: true });
    }
};
