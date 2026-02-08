import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { User, Transaction } from '../../database/index.js';
import config from '../../config/config.js';

const crimes = [
    { name: 'robbing a bank', success: 0.4 },
    { name: 'stealing a car', success: 0.5 },
    { name: 'hacking a system', success: 0.45 },
    { name: 'pickpocketing', success: 0.6 },
    { name: 'scamming someone', success: 0.55 }
];

export default {
    data: new SlashCommandBuilder()
        .setName('crime')
        .setDescription('Commit a crime (high risk, high reward)')
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

        // Check cooldown (2 hours)
        const now = new Date();
        const lastCrime = userData.lastCrime ? new Date(userData.lastCrime) : null;

        if (lastCrime) {
            const timeDiff = now - lastCrime;
            const minutesDiff = timeDiff / (1000 * 60);

            if (minutesDiff < 120) {
                const minutesLeft = Math.ceil(120 - minutesDiff);
                return interaction.reply({
                    content: `⏰ Kamu baru saja commit crime! Coba lagi dalam **${minutesLeft} menit**.`,
                    ephemeral: true
                });
            }
        }

        // Random crime
        const crime = crimes[Math.floor(Math.random() * crimes.length)];
        const success = Math.random() < crime.success;

        if (success) {
            // Success - earn money
            const earnings = Math.floor(
                Math.random() * (config.economy.crimeMax - config.economy.crimeMin + 1)
            ) + config.economy.crimeMin;

            userData.balance += earnings;
            userData.lastCrime = now;
            await userData.save();

            await Transaction.create({
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                type: 'crime',
                amount: earnings,
                description: `Successfully ${crime.name}`
            });

            const embed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('🎭 Crime Successful!')
                .setDescription(
                    `Kamu berhasil **${crime.name}** dan mendapat **$${earnings.toLocaleString()}**!\n` +
                    `💵 Balance: **$${userData.balance.toLocaleString()}**`
                );

            return interaction.reply({ embeds: [embed] });
        } else {
            // Failed - lose money
            const penalty = config.economy.crimeFailPenalty;
            const actualPenalty = Math.min(penalty, userData.balance);

            userData.balance -= actualPenalty;
            userData.lastCrime = now;
            await userData.save();

            await Transaction.create({
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                type: 'crime',
                amount: -actualPenalty,
                description: `Failed ${crime.name}`
            });

            const embed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('🚔 Crime Failed!')
                .setDescription(
                    `Kamu tertangkap saat **${crime.name}** dan kehilangan **$${actualPenalty.toLocaleString()}**!\n` +
                    `💵 Balance: **$${userData.balance.toLocaleString()}**`
                );

            return interaction.reply({ embeds: [embed] });
        }
    },

    cooldown: 5
};
