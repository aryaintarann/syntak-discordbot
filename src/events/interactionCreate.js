import { Events } from 'discord.js';
import FeatureManager from '../utils/featureManager.js';

export default {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Handle Slash Commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}:`, error);

                const errorMessage = {
                    content: '❌ Terjadi kesalahan saat menjalankan command ini!',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }

        // Handle Buttons
        else if (interaction.isButton()) {
            // ... existing Verify logic ...
            if (interaction.customId === 'verify_user') {
                // ... (keep this logic) ...
                try {
                    const config = await FeatureManager.getFeatureConfig(interaction.guildId, 'security', 'verification');

                    if (!config?.enabled || !config?.roleId) {
                        return interaction.reply({ content: '❌ Verification system is not correctly configured.', ephemeral: true });
                    }

                    const role = interaction.guild.roles.cache.get(config.roleId);
                    if (!role) {
                        return interaction.reply({ content: '❌ Verified role not found. Please contact admin.', ephemeral: true });
                    }

                    if (interaction.member.roles.cache.has(role.id)) {
                        return interaction.reply({ content: '✅ You are already verified!', ephemeral: true });
                    }

                    await interaction.member.roles.add(role);
                    await interaction.reply({ content: '✅ Verification successful! You now have access.', ephemeral: true });

                } catch (error) {
                    console.error('Error in verification button:', error);
                    await interaction.reply({ content: '❌ Verification failed. Please try again later.', ephemeral: true });
                }
            }

            // Ticket System
            else if (interaction.customId === 'create_ticket') {
                await handleCreateTicket(interaction);
            }
            else if (interaction.customId === 'close_ticket') {
                await handleCloseTicket(interaction);
            }

            // Reaction Roles
            else if (interaction.customId.startsWith('rr_')) {
                await handleReactionRole(interaction);
            }

            // Giveaway
            else if (interaction.customId === 'giveaway_join') {
                await handleGiveawayJoin(interaction);
            }
        }
    }
};

import pool from '../database/database.js';
import { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

async function handleReactionRole(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const roleId = interaction.customId.replace('rr_', '');
        const role = interaction.guild.roles.cache.get(roleId);

        if (!role) {
            return interaction.editReply('❌ Role not found. Please contact an admin.');
        }

        const hasRole = interaction.member.roles.cache.has(role.id);

        if (hasRole) {
            await interaction.member.roles.remove(role);
            await interaction.editReply(`❌ Removed role **${role.name}**.`);
        } else {
            await interaction.member.roles.add(role);
            await interaction.editReply(`✅ Added role **${role.name}**.`);
        }
    } catch (error) {
        console.error('Error handling reaction role:', error);
        await interaction.editReply('❌ Failed to update role. Please check bot hierarchy.');
    }
}

async function handleGiveawayJoin(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const giveawayId = interaction.message.id; // Or store ID in custom_id? 
        // We need database ID, not message ID.
        // Wait, custom_id is 'giveaway_join'. 
        // We can find giveaway by message_id.

        const [giveaways] = await pool.query('SELECT id, ended FROM giveaways WHERE message_id = ?', [interaction.message.id]);

        if (giveaways.length === 0) {
            return interaction.editReply('❌ This giveaway no longer exists.');
        }

        if (giveaways[0].ended) {
            return interaction.editReply('❌ This giveaway has ended.');
        }

        const giveawayDbId = giveaways[0].id;

        // Check if already joined
        const [existing] = await pool.query(
            'SELECT * FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?',
            [giveawayDbId, interaction.user.id]
        );

        if (existing.length > 0) {
            // Leave
            await pool.query(
                'DELETE FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?',
                [giveawayDbId, interaction.user.id]
            );
            await interaction.editReply('❌ You have left the giveaway.');
        } else {
            // Join
            await pool.query(
                'INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES (?, ?)',
                [giveawayDbId, interaction.user.id]
            );

            // Count entries
            const [countRows] = await pool.query('SELECT COUNT(*) as count FROM giveaway_entries WHERE giveaway_id = ?', [giveawayDbId]);
            const count = countRows[0].count;

            await interaction.editReply(`✅ Entry confirmed! Total entries: ${count}`);
        }

    } catch (error) {
        console.error('Error handling giveaway join:', error);
        await interaction.editReply('❌ Failed to join giveaway.');
    }
}

async function handleCreateTicket(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        // Check if user already has an open ticket
        const [existing] = await pool.query(
            'SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND closed_at IS NULL',
            [interaction.guildId, interaction.user.id]
        );

        if (existing.length > 0) {
            return interaction.editReply(`❌ You already have an open ticket <#${existing[0].channel_id}>.`);
        }

        // Get Config
        const [rows] = await pool.query('SELECT * FROM ticket_config WHERE guild_id = ?', [interaction.guildId]);
        const config = rows[0];

        if (!config) {
            return interaction.editReply('❌ Ticket system is not configured.');
        }

        // Create Channel
        const channelName = `ticket-${interaction.user.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
        const parentId = config.category_id;

        const permissionOverwrites = [
            {
                id: interaction.guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: interaction.user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },
            {
                id: interaction.client.user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            }
        ];

        if (config.staff_role_id) {
            permissionOverwrites.push({
                id: config.staff_role_id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            });
        }

        const channel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: parentId,
            permissionOverwrites: permissionOverwrites
        });

        // Send Welcome Message
        const embed = new EmbedBuilder()
            .setTitle('Support Ticket')
            .setDescription(config.welcome_message || `Hi ${interaction.user}, welcome to your ticket! Please describe your issue and a staff member will be with you shortly.`)
            .setColor(0x5865F2)
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 Close Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

        await channel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });

        // Log to DB
        await pool.query(
            'INSERT INTO tickets (guild_id, user_id, channel_id, created_at) VALUES (?, ?, ?, ?)',
            [interaction.guildId, interaction.user.id, channel.id, Date.now()]
        );

        await interaction.editReply(`✅ Ticket created: ${channel}`);

    } catch (error) {
        console.error('Error creating ticket:', error);
        await interaction.editReply('❌ Failed to create ticket. Please contact an admin.');
    }
}

async function handleCloseTicket(interaction) {
    await interaction.reply('🔒 Closing ticket in 5 seconds...');

    try {
        const channel = interaction.channel;
        const [tickets] = await pool.query('SELECT * FROM tickets WHERE channel_id = ?', [channel.id]);

        if (tickets.length === 0) {
            // Just delete if not found in DB
            setTimeout(() => channel.delete().catch(() => { }), 5000);
            return;
        }

        const ticket = tickets[0];

        // Generate Transcript (Simple text for now)
        const messages = await channel.messages.fetch({ limit: 100 });
        const transcript = messages.reverse().map(m => `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.content}`).join('\n');

        // Save Transcript if configured
        const [configRows] = await pool.query('SELECT * FROM ticket_config WHERE guild_id = ?', [interaction.guildId]);
        const config = configRows[0];

        if (config && config.transcript_channel_id) {
            const logChannel = interaction.guild.channels.cache.get(config.transcript_channel_id);
            if (logChannel && logChannel.isTextBased()) {
                // Send as file attachment
                // We need Buffer
                const buffer = Buffer.from(transcript, 'utf-8');

                await logChannel.send({
                    content: `Ticket Closed: ${channel.name} (User: <@${ticket.user_id}>)`,
                    files: [{
                        attachment: buffer,
                        name: `transcript-${channel.name}.txt`
                    }]
                });
            }
        }

        // Close in DB
        await pool.query('UPDATE tickets SET closed_at = ? WHERE id = ?', [Date.now(), ticket.id]);

        // Delete Channel
        setTimeout(() => channel.delete().catch(() => { }), 5000);

    } catch (error) {
        console.error('Error closing ticket:', error);
    }
}
