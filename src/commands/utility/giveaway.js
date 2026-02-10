import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';
import pool from '../../database/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage giveaways')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new giveaway')
                .addStringOption(option =>
                    option.setName('prize')
                        .setDescription('What is the prize?')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('Number of winners')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to post the giveaway in')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addIntegerOption(option => option.setName('days').setDescription('Duration: Days'))
                .addIntegerOption(option => option.setName('hours').setDescription('Duration: Hours'))
                .addIntegerOption(option => option.setName('minutes').setDescription('Duration: Minutes'))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'start') {
            const prize = interaction.options.getString('prize');
            const winners = interaction.options.getInteger('winners');
            const channel = interaction.options.getChannel('channel');

            const days = interaction.options.getInteger('days') || 0;
            const hours = interaction.options.getInteger('hours') || 0;
            const minutes = interaction.options.getInteger('minutes') || 0;

            const totalMinutes = (days * 24 * 60) + (hours * 60) + minutes;

            await interaction.deferReply({ ephemeral: true });

            if (totalMinutes < 1) {
                return interaction.editReply('❌ Duration must be at least 1 minute.');
            }

            const endTime = Date.now() + (totalMinutes * 60 * 1000);

            // Construct Embed
            const embed = new EmbedBuilder()
                .setTitle('🎉 GIVEAWAY 🎉')
                .setDescription(`**Prize:** ${prize}\n**Winners:** ${winners}\n**Ends:** <t:${Math.floor(endTime / 1000)}:R>\n\nClick the button below to enter!`)
                .setColor(0xFF0000)
                .setFooter({ text: `Hosted by ${interaction.user.username}` });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('giveaway_join')
                        .setLabel('🎉 Join / Leave Giveaway')
                        .setStyle(ButtonStyle.Success)
                );

            try {
                const message = await channel.send({ embeds: [embed], components: [row] });

                // Save to DB
                await pool.query(
                    'INSERT INTO giveaways (guild_id, channel_id, message_id, prize, end_time, winners_count, host_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [interaction.guild.id, channel.id, message.id, prize, endTime, winners, interaction.user.id]
                );

                await interaction.editReply(`✅ Giveaway started in ${channel}!`);
            } catch (error) {
                console.error('Error starting giveaway:', error);
                await interaction.editReply('❌ Failed to start giveaway. Check permissions.');
            }
        }
    }
};
