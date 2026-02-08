import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { User, Transaction } from '../../database/index.js';
import config from '../../config/config.js';

const workJobs = [
    { name: 'Programmer', emoji: '💻' },
    { name: 'Teacher', emoji: '👨‍🏫' },
    { name: 'Chef', emoji: '👨‍🍳' },
    { name: 'Doctor', emoji: '👨‍⚕️' },
    { name: 'Streamer', emoji: '🎮' },
    { name: 'YouTuber', emoji: '📹' },
    { name: 'Artist', emoji: '🎨' },
    { name: 'Musician', emoji: '🎵' }
];

export default {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Work to earn money')
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

        // Check cooldown (1 hour)
        const now = new Date();
        const lastWork = userData.lastWork ? new Date(userData.lastWork) : null;

        if (lastWork) {
            const timeDiff = now - lastWork;
            const minutesDiff = timeDiff / (1000 * 60);

            if (minutesDiff < 60) {
                const minutesLeft = Math.ceil(60 - minutesDiff);
                return interaction.reply({
                    content: `⏰ Kamu sudah kerja! Coba lagi dalam **${minutesLeft} menit**.`,
                    ephemeral: true
                });
            }
        }

        // Random job and earnings
        const job = workJobs[Math.floor(Math.random() * workJobs.length)];
        const earnings = Math.floor(
            Math.random() * (config.economy.workMax - config.economy.workMin + 1)
        ) + config.economy.workMin;

        // Update user data
        userData.balance += earnings;
        userData.lastWork = now;
        await userData.save();

        // Log transaction
        await Transaction.create({
            userId: interaction.user.id,
            guildId: interaction.guild.id,
            type: 'work',
            amount: earnings,
            description: `Worked as ${job.name}`
        });

        const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle(`${job.emoji} Work Complete!`)
            .setDescription(
                `Kamu bekerja sebagai **${job.name}** dan mendapat **$${earnings.toLocaleString()}**!\n` +
                `💵 Balance: **$${userData.balance.toLocaleString()}**`
            )
            .setFooter({ text: 'Kamu bisa kerja lagi dalam 1 jam!' });

        return interaction.reply({ embeds: [embed] });
    },

    cooldown: 5
};
