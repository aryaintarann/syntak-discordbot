import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { User } from '../../database/index.js';
import config from '../../config/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Display the server leaderboard')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Leaderboard type')
                .setRequired(false)
                .addChoices(
                    { name: 'XP/Levels', value: 'xp' },
                    { name: 'Money', value: 'money' }
                ))
        .setDMPermission(false),

    async execute(interaction) {
        await interaction.deferReply();

        const type = interaction.options.getString('type') || 'xp';

        // Get top 10 users
        const orderBy = type === 'xp' ? 'xp' : 'balance';
        const topUsers = await User.findAll({
            where: { guildId: interaction.guild.id },
            order: [[orderBy, 'DESC']],
            limit: 10
        });

        if (topUsers.length === 0) {
            return interaction.editReply('❌ Belum ada data untuk leaderboard!');
        }

        // Build leaderboard description
        let description = '';
        const medals = ['🥇', '🥈', '🥉'];

        for (let i = 0; i < topUsers.length; i++) {
            const user = topUsers[i];
            try {
                const discordUser = await interaction.client.users.fetch(user.userId);
                const medal = i < 3 ? medals[i] : `**${i + 1}.**`;

                if (type === 'xp') {
                    description += `${medal} ${discordUser.username} - Level ${user.level} (${user.xp.toLocaleString()} XP)\n`;
                } else {
                    const total = user.balance + user.bank;
                    description += `${medal} ${discordUser.username} - $${total.toLocaleString()}\n`;
                }
            } catch (error) {
                continue;
            }
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`🏆 ${interaction.guild.name} Leaderboard`)
            .setDescription(description)
            .setFooter({ text: type === 'xp' ? 'Top 10 by XP' : 'Top 10 by Money' })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    },

    cooldown: 5
};
