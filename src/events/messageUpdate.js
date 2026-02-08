import { Events, EmbedBuilder } from 'discord.js';
import { Guild } from '../database/index.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';

export default {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage, client) {
        if (!newMessage.guild || newMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return; // Ignore embed updates

        const guildData = await Guild.findByPk(newMessage.guild.id);
        if (!guildData?.modLogChannelId) return;

        try {
            const logChannel = await newMessage.guild.channels.fetch(guildData.modLogChannelId);

            const logEmbed = new EmbedBuilder()
                .setColor(config.colors.info)
                .setTitle('✏️ Message Edited')
                .addFields(
                    { name: 'Author', value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
                    { name: 'Channel', value: `${newMessage.channel}`, inline: true },
                    { name: 'Before', value: oldMessage.content || '*No content*' },
                    { name: 'After', value: newMessage.content || '*No content*' },
                    { name: 'Jump to Message', value: `[Click here](${newMessage.url})` }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
        } catch (error) {
            logger.error('Error logging edited message:', error);
        }
    }
};
