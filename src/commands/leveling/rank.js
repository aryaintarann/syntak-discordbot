import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { User } from '../../database/index.js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import config from '../../config/config.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Display your rank card or another user\'s rank card')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check rank')
                .setRequired(false))
        .setDMPermission(false),

    async execute(interaction) {
        await interaction.deferReply();

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

        // Get user rank in server
        const allUsers = await User.findAll({
            where: { guildId: interaction.guild.id },
            order: [['xp', 'DESC']]
        });

        const rank = allUsers.findIndex(u => u.userId === target.id) + 1;

        // Calculate XP for next level
        const currentLevelXp = config.leveling.levelFormula(userData.level - 1);
        const nextLevelXp = config.leveling.levelFormula(userData.level);
        const xpProgress = userData.xp - currentLevelXp;
        const xpNeeded = nextLevelXp - currentLevelXp;
        const progressPercent = (xpProgress / xpNeeded) * 100;

        // Create rank card
        const canvas = createCanvas(934, 282);
        const ctx = canvas.getContext('2d');

        // Background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Avatar circle background
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(141, 141, 100, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();

        // Load and draw avatar
        try {
            const avatarURL = target.displayAvatarURL({ extension: 'png', size: 256 });
            const avatar = await loadImage(avatarURL);

            ctx.save();
            ctx.beginPath();
            ctx.arc(141, 141, 95, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 46, 46, 190, 190);
            ctx.restore();
        } catch (error) {
            logger.error('Error loading avatar:', error);
        }

        // Username
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Arial';
        ctx.fillText(target.username, 320, 100);

        // Level and Rank
        ctx.font = 'bold 28px Arial';
        ctx.fillText(`Level ${userData.level}`, 320, 150);
        ctx.fillText(`Rank #${rank}`, 600, 150);

        // Progress bar background
        const barX = 320;
        const barY = 180;
        const barWidth = 550;
        const barHeight = 40;

        ctx.fillStyle = '#00000030';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Progress bar fill
        const progressGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
        progressGradient.addColorStop(0, '#f093fb');
        progressGradient.addColorStop(1, '#f5576c');
        ctx.fillStyle = progressGradient;
        ctx.fillRect(barX, barY, (barWidth * progressPercent) / 100, barHeight);

        // XP text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        const xpText = `${xpProgress.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`;
        ctx.fillText(xpText, barX + barWidth / 2 - ctx.measureText(xpText).width / 2, barY + 27);

        // Convert to attachment
        const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), {
            name: 'rank-card.png'
        });

        return interaction.editReply({ files: [attachment] });
    },

    cooldown: 5
};
