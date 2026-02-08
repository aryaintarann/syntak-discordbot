import { Events } from 'discord.js';
import logger from '../utils/logger.js';

export default {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                logger.warn(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            // Cooldown handling
            const { cooldowns } = client;
            if (!cooldowns.has(command.data.name)) {
                cooldowns.set(command.data.name, new Map());
            }

            const now = Date.now();
            const timestamps = cooldowns.get(command.data.name);
            const cooldownAmount = (command.cooldown || 3) * 1000;

            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    return interaction.reply({
                        content: `⏰ Mohon tunggu ${timeLeft.toFixed(1)} detik sebelum menggunakan \`${command.data.name}\` lagi.`,
                        ephemeral: true
                    });
                }
            }

            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

            // Execute command
            try {
                logger.command(
                    interaction.commandName,
                    interaction.user.tag,
                    interaction.guild?.name || 'DM'
                );

                await command.execute(interaction, client);
            } catch (error) {
                logger.error(`Error executing ${interaction.commandName}:`, error);

                const errorMessage = {
                    content: '❌ Terjadi error saat menjalankan command ini!',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }

        // Handle buttons
        else if (interaction.isButton()) {
            const { customId } = interaction;

            // Ticket system buttons
            if (customId === 'create_ticket') {
                const { createTicket } = await import('../utils/ticketSystem.js');
                await createTicket(interaction);
            } else if (customId.startsWith('close_ticket_')) {
                const { closeTicket } = await import('../utils/ticketSystem.js');
                await closeTicket(interaction);
            }

            // Giveaway participation
            else if (customId.startsWith('join_giveaway_')) {
                const giveawayId = customId.split('_')[2];
                const { Giveaway } = await import('../database/index.js');

                const giveaway = await Giveaway.findByPk(giveawayId);
                if (!giveaway || giveaway.ended) {
                    return interaction.reply({
                        content: '❌ Giveaway ini sudah berakhir!',
                        ephemeral: true
                    });
                }

                const participants = giveaway.participants || [];
                if (participants.includes(interaction.user.id)) {
                    return interaction.reply({
                        content: '✅ Kamu sudah terdaftar dalam giveaway ini!',
                        ephemeral: true
                    });
                }

                participants.push(interaction.user.id);
                giveaway.participants = participants;
                await giveaway.save();

                await interaction.reply({
                    content: '🎉 Kamu berhasil mengikuti giveaway!',
                    ephemeral: true
                });
            }
        }

        // Handle select menus
        else if (interaction.isStringSelectMenu()) {
            // Can be extended for shop items, role selection, etc.
            logger.debug(`Select menu interaction: ${interaction.customId}`);
        }
    }
};
