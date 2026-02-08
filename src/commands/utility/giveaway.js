import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Giveaway } from '../../database/index.js';
import config from '../../config/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Start a giveaway')
        .addStringOption(option =>
            option.setName('prize')
                .setDescription('The prize')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration in minutes')
                .setRequired(true)
                .setMinValue(1))
        .addIntegerOption(option =>
            option.setName('winners')
                .setDescription('Number of winners')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(20))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute(interaction) {
        const prize = interaction.options.getString('prize');
        const duration = interaction.options.getInteger('duration');
        const winnerCount = interaction.options.getInteger('winners') || 1;

        const endTime = new Date(Date.now() + duration * 60 * 1000);

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('🎉 GIVEAWAY 🎉')
            .setDescription(
                `**Prize:** ${prize}\n` +
                `**Winners:** ${winnerCount}\n` +
                `**Ends:** <t:${Math.floor(endTime.getTime() / 1000)}:R>\n\n` +
                `React with 🎉 to participate!`
            )
            .setFooter({ text: `Hosted by ${interaction.user.username}` })
            .setTimestamp(endTime);

        const message = await interaction.reply({
            embeds: [embed],
            fetchReply: true
        });

        // Add reaction
        await message.react('🎉');

        // Create giveaway in database
        await Giveaway.create({
            guildId: interaction.guild.id,
            channelId: interaction.channel.id,
            messageId: message.id,
            prize: prize,
            winnerCount: winnerCount,
            hostId: interaction.user.id,
            endTime: endTime
        });
    },

    cooldown: 10
};
