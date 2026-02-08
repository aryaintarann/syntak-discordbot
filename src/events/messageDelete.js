import { Events, EmbedBuilder, AuditLogEvent } from 'discord.js';
import { Guild } from '../database/index.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';

export default {
    name: Events.MessageDelete,
    async execute(message, client) {
        if (!message.guild || message.author?.bot) return;

        const guildData = await Guild.findByPk(message.guild.id);
        if (!guildData?.modLogChannelId) return;

        try {
            const logChannel = await message.guild.channels.fetch(guildData.modLogChannelId);

            // Fetch audit logs to see who deleted the message
            let deletedBy = null;
            try {
                const auditLogs = await message.guild.fetchAuditLogs({
                    type: AuditLogEvent.MessageDelete,
                    limit: 1
                });

                const auditEntry = auditLogs.entries.first();
                if (auditEntry && auditEntry.target.id === message.author?.id) {
                    deletedBy = auditEntry.executor;
                }
            } catch (error) {
                logger.debug('Could not fetch audit logs');
            }

            const logEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('🗑️ Message Deleted')
                .addFields(
                    { name: 'Author', value: message.author ? `${message.author.tag} (${message.author.id})` : 'Unknown', inline: true },
                    { name: 'Channel', value: `${message.channel}`, inline: true },
                    { name: 'Message Content', value: message.content || '*No text content*' }
                );

            if (deletedBy && deletedBy.id !== message.author?.id) {
                logEmbed.addFields({ name: 'Deleted By', value: deletedBy.tag });
            }

            if (message.attachments.size > 0) {
                const attachments = message.attachments.map(a => a.url).join('\n');
                logEmbed.addFields({ name: 'Attachments', value: attachments });
            }

            logEmbed.setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
        } catch (error) {
            logger.error('Error logging deleted message:', error);
        }
    }
};
