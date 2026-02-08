import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { User } from '../../database/index.js';
import config from '../../config/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your balance or another user\'s balance')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check balance')
                .setRequired(false))
        .setDMPermission(false),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;

        let userData = await User.findOne({
            where: { userId: target.id, guildId: interaction.guild.id }
        });

        if (!userData) {
            userData = await User.create({
                userId: target.id,
                guildId: interaction.guild.id
            });
        }

        const totalWealth = userData.balance + userData.bank;

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`💰 ${target.username}'s Balance`)
            .setThumbnail(target.displayAvatarURL())
            .addFields(
                { name: '💵 Wallet', value: `$${userData.balance.toLocaleString()}`, inline: true },
                { name: '🏦 Bank', value: `$${userData.bank.toLocaleString()}`, inline: true },
                { name: '💎 Total', value: `$${totalWealth.toLocaleString()}`, inline: true }
            );

        return interaction.reply({ embeds: [embed] });
    },

    cooldown: 2
};
