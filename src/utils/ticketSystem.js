import { PermissionsBitField, EmbedBuilder, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { Ticket } from '../database/index.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

export async function createTicket(interaction) {
    const guild = interaction.guild;
    const member = interaction.member;

    // Check if user already has an open ticket
    const existingTicket = await Ticket.findOne({
        where: {
            guildId: guild.id,
            userId: member.id,
            status: 'open'
        }
    });

    if (existingTicket) {
        return interaction.reply({
            content: '❌ Kamu sudah memiliki ticket yang aktif!',
            ephemeral: true
        });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        // Create ticket channel
        const ticketChannel = await guild.channels.create({
            name: `ticket-${member.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: member.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                },
                {
                    id: interaction.client.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                }
            ]
        });

        // Create ticket in database
        const ticket = await Ticket.create({
            ticketId: `ticket-${Date.now()}`,
            guildId: guild.id,
            channelId: ticketChannel.id,
            userId: member.id
        });

        // Create close button
        const closeButton = new ButtonBuilder()
            .setCustomId(`close_ticket_${ticket.id}`)
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒');

        const row = new ActionRowBuilder().addComponents(closeButton);

        // Send welcome message in ticket
        const welcomeEmbed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('🎫 Support Ticket')
            .setDescription(
                `Welcome ${member}!\n\n` +
                `Support team akan segera membantu Anda.\n` +
                `Jelaskan masalah atau pertanyaan Anda di sini.`
            )
            .setFooter({ text: 'Klik tombol di bawah untuk menutup ticket.' });

        await ticketChannel.send({
            content: `${member}`,
            embeds: [welcomeEmbed],
            components: [row]
        });

        return interaction.editReply({
            content: `✅ Ticket berhasil dibuat! ${ticketChannel}`,
            ephemeral: true
        });

    } catch (error) {
        logger.error('Error creating ticket:', error);
        return interaction.editReply({
            content: '❌ Error membuat ticket!',
            ephemeral: true
        });
    }
}

export async function closeTicket(interaction) {
    const ticketId = parseInt(interaction.customId.split('_')[2]);

    const ticket = await Ticket.findByPk(ticketId);

    if (!ticket || ticket.status === 'closed') {
        return interaction.reply({
            content: '❌ Ticket tidak ditemukan atau sudah ditutup!',
            ephemeral: true
        });
    }

    await interaction.deferReply();

    try {
        // Fetch all messages for transcript
        const channel = interaction.channel;
        const messages = await channel.messages.fetch({ limit: 100 });

        // Create HTML transcript
        let transcript = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Ticket Transcript - ${ticket.ticketId}</title>
        <style>
          body { font-family: Arial, sans-serif; background: #36393f; color: #dcddde; padding: 20px; }
          .message { margin: 10px 0; padding: 10px; background: #40444b; border-radius: 5px; }
          .author { font-weight: bold; color: #7289da; }
          .timestamp { color: #72767d; font-size: 0.8em; }
          .content { margin-top: 5px; }
        </style>
      </head>
      <body>
        <h1>Ticket Transcript: ${ticket.ticketId}</h1>
        <p>Created by: <strong>${interaction.user.tag}</strong></p>
        <p>Closed by: <strong>${interaction.user.tag}</strong></p>
        <p>Closed at: <strong>${new Date().toLocaleString()}</strong></p>
        <hr>
    `;

        messages.reverse().forEach(msg => {
            transcript += `
        <div class="message">
          <div class="author">${msg.author.tag}</div>
          <div class="timestamp">${msg.createdAt.toLocaleString()}</div>
          <div class="content">${msg.content || '<em>No text content</em>'}</div>
        </div>
      `;
        });

        transcript += `
      </body>
      </html>
    `;

        // Save transcript
        const transcriptPath = join(process.cwd(), 'transcripts', `${ticket.ticketId}.html`);
        try {
            const { mkdirSync } = await import('fs');
            mkdirSync(join(process.cwd(), 'transcripts'), { recursive: true });
            writeFileSync(transcriptPath, transcript);
        } catch (error) {
            logger.error('Error saving transcript:', error);
        }

        // Update ticket in database
        ticket.status = 'closed';
        ticket.closedAt = new Date();
        ticket.closedBy = interaction.user.id;
        ticket.transcriptPath = transcriptPath;
        await ticket.save();

        // Send confirmation
        await interaction.editReply('✅ Ticket akan ditutup dalam 5 detik...');

        // Delete channel after 5 seconds
        setTimeout(async () => {
            try {
                await channel.delete();
            } catch (error) {
                logger.error('Error deleting ticket channel:', error);
            }
        }, 5000);

    } catch (error) {
        logger.error('Error closing ticket:', error);
        await interaction.editReply('❌ Error menutup ticket!');
    }
}
