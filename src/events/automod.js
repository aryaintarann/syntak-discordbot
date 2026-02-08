import { Events, EmbedBuilder, PermissionsBitField } from 'discord.js';
import { Guild } from '../database/index.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        // Ignore bots and DMs
        if (message.author.bot || !message.guild) return;

        // Check if auto-mod is enabled
        const guildData = await Guild.findByPk(message.guild.id);
        if (!guildData || !guildData.autoModEnabled) return;

        // Skip if user has admin or moderator permissions
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
            message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return;
        }

        let violationType = null;
        let actionTaken = false;

        // 1. BAD WORDS FILTER
        const badWords = [...config.moderation.badWords, ...(guildData.badWords || [])];
        const messageContent = message.content.toLowerCase();

        for (const word of badWords) {
            if (messageContent.includes(word.toLowerCase())) {
                violationType = 'Bad Word';
                try {
                    await message.delete();
                    actionTaken = true;

                    const warningMsg = await message.channel.send({
                        content: `⚠️ ${message.author}, mohon jangan menggunakan kata-kata kasar!`
                    });

                    setTimeout(() => warningMsg.delete().catch(() => { }), 5000);
                } catch (error) {
                    logger.error('Error deleting bad word message:', error);
                }
                break;
            }
        }

        // 2. INVITE LINK FILTER
        if (!violationType && guildData.autoModEnabled) {
            const inviteRegex = /discord(?:\.gg|app\.com\/invite)\/([\w-]+)/gi;
            const invites = messageContent.match(inviteRegex);

            if (invites) {
                const allowedInvites = guildData.allowedInvites || [];
                const isAllowed = invites.some(invite => {
                    const code = invite.split('/').pop();
                    return allowedInvites.includes(code);
                });

                if (!isAllowed) {
                    violationType = 'Invite Link';
                    try {
                        await message.delete();
                        actionTaken = true;

                        const warningMsg = await message.channel.send({
                            content: `⚠️ ${message.author}, invite links tidak diperbolehkan di sini!`
                        });

                        setTimeout(() => warningMsg.delete().catch(() => { }), 5000);
                    } catch (error) {
                        logger.error('Error deleting invite:', error);
                    }
                }
            }
        }

        // 3. MASS MENTIONS
        if (!violationType && config.moderation.antiSpamEnabled) {
            const mentions = message.mentions.users.size;

            if (mentions > config.moderation.maxMentions) {
                violationType = 'Mass Mention';
                try {
                    await message.delete();
                    actionTaken = true;

                    const warningMsg = await message.channel.send({
                        content: `⚠️ ${message.author}, jangan spam mention!`
                    });

                    setTimeout(() => warningMsg.delete().catch(() => { }), 5000);
                } catch (error) {
                    logger.error('Error deleting mass mention:', error);
                }
            }
        }

        // 4. LINK SPAM
        if (!violationType && guildData.antiSpamEnabled) {
            const urlRegex = /(https?:\/\/[^\s]+)/gi;
            const links = messageContent.match(urlRegex);

            if (links && links.length > 3) {
                violationType = 'Link Spam';
                try {
                    await message.delete();
                    actionTaken = true;

                    const warningMsg = await message.channel.send({
                        content: `⚠️ ${message.author}, jangan spam link!`
                    });

                    setTimeout(() => warningMsg.delete().catch(() => { }), 5000);
                } catch (error) {
                    logger.error('Error deleting link spam:', error);
                }
            }
        }

        // 5. SPAM DETECTION (Rate limiting)
        if (!violationType && config.moderation.antiSpamEnabled) {
            const userKey = `${message.guild.id}-${message.author.id}`;

            if (!client.messageTracking.has(userKey)) {
                client.messageTracking.set(userKey, []);
            }

            const timestamps = client.messageTracking.get(userKey);
            const now = Date.now();

            // Remove timestamps older than 1 minute
            const recentMessages = timestamps.filter(t => now - t < 60000);
            recentMessages.push(now);
            client.messageTracking.set(userKey, recentMessages);

            if (recentMessages.length > config.moderation.maxMessagesPerMinute) {
                violationType = 'Message Spam';
                try {
                    await message.delete();
                    actionTaken = true;

                    // Timeout for 5 minutes if spamming
                    if (message.member.moderatable) {
                        await message.member.timeout(5 * 60 * 1000, 'Auto-mod: Message spam');
                    }

                    const warningMsg = await message.channel.send({
                        content: `⚠️ ${message.author}, kamu diam-kan selama 5 menit karena spam!`
                    });

                    setTimeout(() => warningMsg.delete().catch(() => { }), 5000);
                } catch (error) {
                    logger.error('Error handling spam:', error);
                }
            }
        }

        // LOG TO MOD LOGS
        if (actionTaken && guildData?.modLogChannelId) {
            try {
                const logChannel = await message.guild.channels.fetch(guildData.modLogChannelId);
                const logEmbed = new EmbedBuilder()
                    .setColor(config.colors.warning)
                    .setTitle('🛡️ Auto-Moderation Action')
                    .addFields(
                        { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
                        { name: 'Channel', value: `${message.channel}`, inline: true },
                        { name: 'Violation', value: violationType, inline: true },
                        { name: 'Message Content', value: message.content.substring(0, 1000) || 'No content' }
                    )
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            } catch (error) {
                logger.error('Error sending automod log:', error);
            }
        }
    }
};
