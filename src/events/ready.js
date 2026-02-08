import { Events } from 'discord.js';
import logger from '../utils/logger.js';

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        logger.success(`Bot is ready! Logged in as ${client.user.tag}`);
        logger.info(`Serving ${client.guilds.cache.size} guilds with ${client.users.cache.size} users`);

        // Set bot status
        client.user.setPresence({
            activities: [{ name: 'with Discord.js v14', type: 0 }],
            status: 'online'
        });

        // Start giveaway checker
        setInterval(async () => {
            const { Giveaway } = await import('../database/index.js');
            const activeGiveaways = await Giveaway.findAll({
                where: {
                    ended: false
                }
            });

            for (const giveaway of activeGiveaways) {
                if (new Date() >= new Date(giveaway.endTime)) {
                    // End giveaway
                    try {
                        const channel = await client.channels.fetch(giveaway.channelId);
                        const message = await channel.messages.fetch(giveaway.messageId);

                        // Get reactions
                        const reaction = message.reactions.cache.get('🎉');
                        if (!reaction) continue;

                        const users = await reaction.users.fetch();
                        const participants = users.filter(u => !u.bot).map(u => u.id);

                        if (participants.length === 0) {
                            await message.reply('Tidak ada yang mengikuti giveaway ini! 😢');
                            giveaway.ended = true;
                            await giveaway.save();
                            continue;
                        }

                        // Select winners
                        const winners = [];
                        for (let i = 0; i < Math.min(giveaway.winnerCount, participants.length); i++) {
                            const randomIndex = Math.floor(Math.random() * participants.length);
                            winners.push(participants.splice(randomIndex, 1)[0]);
                        }

                        giveaway.winners = winners;
                        giveaway.ended = true;
                        await giveaway.save();

                        // Announce winners
                        const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
                        await message.reply(`🎉 **GIVEAWAY ENDED!** 🎉\n\nSelamat kepada ${winnerMentions}!\nAnda memenangkan: **${giveaway.prize}**`);

                        logger.info(`Giveaway ended: ${giveaway.prize} - Winners: ${winners.length}`);
                    } catch (error) {
                        logger.error('Error ending giveaway:', error);
                    }
                }
            }
        }, 10000); // Check every 10 seconds

        logger.info('Giveaway checker started.');
    }
};
