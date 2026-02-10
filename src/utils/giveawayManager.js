import pool from '../database/database.js';
import { EmbedBuilder } from 'discord.js';

export class GiveawayManager {
    constructor(client) {
        this.client = client;
    }

    start() {
        console.log('🎉 Giveaway Manager started.');
        setInterval(() => this.checkGiveaways(), 30 * 1000); // Check every 30s
    }

    async checkGiveaways() {
        try {
            const now = Date.now();
            const [giveaways] = await pool.query(
                'SELECT * FROM giveaways WHERE ended = 0 AND end_time <= ?',
                [now]
            );

            for (const giveaway of giveaways) {
                await this.endGiveaway(giveaway);
            }
        } catch (error) {
            console.error('Error checking giveaways:', error);
        }
    }

    async endGiveaway(giveaway) {
        try {
            // Mark as ended first to prevent double processing
            await pool.query('UPDATE giveaways SET ended = 1 WHERE id = ?', [giveaway.id]);

            const channel = await this.client.channels.fetch(giveaway.channel_id).catch(() => null);
            if (!channel || !channel.isTextBased()) return;

            const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
            if (!message) return;

            // Get Entries
            const [entries] = await pool.query('SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?', [giveaway.id]);

            if (entries.length === 0) {
                const embed = EmbedBuilder.from(message.embeds[0]);
                embed.setDescription('Only ghosts entered... No winners.');
                embed.setColor(0x2F3136); // Grey
                embed.setFooter({ text: 'Ended' });

                await message.edit({ embeds: [embed], components: [] });
                await channel.send(`The giveaway for **${giveaway.prize}** has ended. No entries.`);
                return;
            }

            // Pick Winners
            const winnersCount = Math.min(giveaway.winners_count, entries.length);
            const winners = [];
            const shuffled = entries.sort(() => 0.5 - Math.random());

            for (let i = 0; i < winnersCount; i++) {
                winners.push(shuffled[i].user_id);
            }

            const winnersText = winners.map(id => `<@${id}>`).join(', ');

            // Update Message
            const embed = EmbedBuilder.from(message.embeds[0]);
            embed.setDescription(`Ended! Winners: ${winnersText}`);
            embed.setColor(0x2F3136);
            embed.setFooter({ text: `Ended • Winners: ${winners.length}` });

            await message.edit({ embeds: [embed], components: [] });

            // Announce
            await channel.send(`🎉 Congratulations ${winnersText}! You won **${giveaway.prize}**!`);

        } catch (error) {
            console.error(`Error ending giveaway ${giveaway.id}:`, error);
        }
    }
}
