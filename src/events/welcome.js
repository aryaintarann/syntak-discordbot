import { Events, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { Guild } from '../database/index.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import logger from '../utils/logger.js';

export default {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        const guildData = await Guild.findOrCreate({
            where: { guildId: member.guild.id },
            defaults: { guildId: member.guild.id }
        });

        const settings = guildData[0];

        if (!settings.welcomeEnabled || !settings.welcomeChannelId) return;

        try {
            const welcomeChannel = await member.guild.channels.fetch(settings.welcomeChannelId);
            if (!welcomeChannel) return;

            // Create welcome image
            const canvas = createCanvas(800, 400);
            const ctx = canvas.getContext('2d');

            // Background gradient
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Welcome text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 60px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('WELCOME', canvas.width / 2, 100);

            // Username
            ctx.font = 'bold 40px Arial';
            ctx.fillText(member.user.username, canvas.width / 2, 180);

            // Member count
            ctx.font = '30px Arial';
            ctx.fillText(`Member #${member.guild.memberCount}`, canvas.width / 2, 240);

            // Avatar
            try {
                const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
                const avatar = await loadImage(avatarURL);

                ctx.save();
                ctx.beginPath();
                ctx.arc(canvas.width / 2, 320, 60, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatar, canvas.width / 2 - 60, 260, 120, 120);
                ctx.restore();
            } catch (error) {
                logger.error('Error loading avatar for welcome:', error);
            }

            const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), {
                name: 'welcome.png'
            });

            // Replace placeholders in message
            const message = settings.welcomeMessage
                .replace('{user}', member.toString())
                .replace('{server}', member.guild.name)
                .replace('{count}', member.guild.memberCount);

            await welcomeChannel.send({
                content: message,
                files: [attachment]
            });

        } catch (error) {
            logger.error('Error sending welcome message:', error);
        }
    }
};
