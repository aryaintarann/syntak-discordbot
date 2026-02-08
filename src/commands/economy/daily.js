import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { User, Transaction } from '../../database/index.js';
import config from '../../config/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily reward')
        .setDMPermission(false),

    async execute(interaction) {
        let userData = await User.findOne({
            where: { userId: interaction.user.id, guildId: interaction.guild.id }
        });

        if (!userData) {
            userData = await User.create({
                userId: interaction.user.id,
                guildId: interaction.guild.id
            });
        }

        const now = new Date();
        const lastDaily = userData.lastDaily ? new Date(userData.lastDaily) : null;

        // Check if already claimed today
        if (lastDaily) {
            const timeDiff = now - lastDaily;
            const hoursDiff = timeDiff / (1000 * 60 * 60);

            if (hoursDiff < 24) {
                const hoursLeft = Math.ceil(24 - hoursDiff);
                return interaction.reply({
                    content: `⏰ Kamu sudah claim daily hari ini! Coba lagi dalam **${hoursLeft} jam**.`,
                    ephemeral: true
                });
            }
        }

        // Check streak
        let streak = userData.dailyStreak || 0;
        if (lastDaily) {
            const daysDiff = (now - lastDaily) / (1000 * 60 * 60 * 24);
            if (daysDiff >= 1 && daysDiff < 2) {
                streak += 1;
            } else if (daysDiff >= 2) {
                streak = 1;
            }
        } else {
            streak = 1;
        }

        // Calculate reward (bonus for streak)
        const baseReward = config.economy.dailyReward;
        const streakBonus = Math.min(streak * 50, 1000); // Max 1000 bonus
        const totalReward = baseReward + streakBonus;

        // Update user data
        userData.balance += totalReward;
        userData.lastDaily = now;
        userData.dailyStreak = streak;
        await userData.save();

        // Log transaction
        await Transaction.create({
            userId: interaction.user.id,
            guildId: interaction.guild.id,
            type: 'daily',
            amount: totalReward,
            description: `Daily reward (Streak: ${streak})`
        });

        const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('🎁 Daily Reward Claimed!')
            .setDescription(
                `Kamu mendapat **$${totalReward.toLocaleString()}**!\n` +
                `💵 Balance: **$${userData.balance.toLocaleString()}**`
            )
            .addFields(
                { name: '🔥 Streak', value: `${streak} hari`, inline: true },
                { name: '🎯 Streak Bonus', value: `+$${streakBonus}`, inline: true }
            )
            .setFooter({ text: 'Claim lagi dalam 24 jam untuk menjaga streak!' });

        return interaction.reply({ embeds: [embed] });
    },

    cooldown: 5
};
