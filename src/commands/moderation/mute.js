import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import FeatureManager from '../../utils/featureManager.js';
import { colors } from '../../utils/embedBuilder.js';
import pool from '../../database/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute member (role-based)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User yang akan di-mute')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('durasi')
                .setDescription('Durasi mute (contoh: 1h, 30m, 1d)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('alasan')
                .setDescription('Alasan mute')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        // Check if feature is enabled
        const isEnabled = await FeatureManager.isEnabled(interaction.guildId, 'moderation', 'mute');
        if (!isEnabled) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Fitur Dinonaktifkan')
                    .setDescription('Command `/mute` tidak diaktifkan di server ini.\nAdmin dapat mengaktifkannya di Dashboard.')],
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser('user');
        const duration = interaction.options.getString('durasi');
        const reason = interaction.options.getString('alasan') || 'Tidak ada alasan';

        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ User Tidak Ditemukan')
                    .setDescription('User tersebut tidak ada di server ini.')],
                ephemeral: true
            });
        }

        // Check hierarchy
        if (member.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Tidak Dapat Mute')
                    .setDescription('Anda tidak dapat mute user dengan role yang sama atau lebih tinggi.')],
                ephemeral: true
            });
        }

        try {
            // Find or create muted role
            let mutedRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');

            if (!mutedRole) {
                mutedRole = await interaction.guild.roles.create({
                    name: 'Muted',
                    color: '#808080',
                    permissions: [],
                    reason: 'Auto-created muted role'
                });

                // Set permissions for all channels
                interaction.guild.channels.cache.forEach(async (channel) => {
                    if (channel.isTextBased() || channel.isVoiceBased()) {
                        await channel.permissionOverwrites.edit(mutedRole, {
                            SendMessages: false,
                            AddReactions: false,
                            Speak: false
                        }).catch(() => { });
                    }
                });
            }

            // Add muted role
            await member.roles.add(mutedRole, reason);

            // Parse duration and set unmute timer if specified
            let durationMs = null;
            let durationText = 'Permanen';

            if (duration) {
                durationMs = parseDuration(duration);
                if (durationMs) {
                    durationText = duration;

                    // Store in database for auto-unmute
                    await pool.query(
                        `INSERT INTO active_timeouts (user_id, guild_id, expiry_time, created_at, notified) 
                         VALUES (?, ?, ?, ?, 0) 
                         ON DUPLICATE KEY UPDATE expiry_time = ?, notified = 0`,
                        [member.id, interaction.guildId, Date.now() + durationMs, Date.now(), Date.now() + durationMs]
                    );

                    // Set timeout for auto-unmute
                    setTimeout(async () => {
                        try {
                            const m = await interaction.guild.members.fetch(member.id).catch(() => null);
                            if (m && m.roles.cache.has(mutedRole.id)) {
                                await m.roles.remove(mutedRole, 'Mute duration expired');
                            }
                        } catch (e) {
                            console.error('Error auto-unmuting:', e);
                        }
                    }, Math.min(durationMs, 2147483647)); // Max setTimeout value
                }
            }

            // Log the action
            const caseNumber = await FeatureManager.logModAction({
                guildId: interaction.guildId,
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                userId: member.id,
                userTag: member.user.tag,
                actionType: 'mute',
                reason,
                duration: durationMs ? Math.floor(durationMs / 1000) : null
            });

            const embed = new EmbedBuilder()
                .setColor(colors.warn)
                .setTitle('🔇 User Dimute')
                .setDescription(`${member} telah dimute.`)
                .addFields(
                    { name: 'User', value: `${member.user.tag}`, inline: true },
                    { name: 'Durasi', value: durationText, inline: true },
                    { name: 'Case', value: `#${caseNumber}`, inline: true },
                    { name: 'Alasan', value: reason, inline: false },
                    { name: 'Moderator', value: interaction.user.tag, inline: true }
                );

            await interaction.reply({ embeds: [embed] });

            // DM the user
            try {
                await member.send({
                    embeds: [new EmbedBuilder()
                        .setColor(colors.warn)
                        .setTitle('🔇 Anda Dimute')
                        .setDescription(`Anda telah dimute di **${interaction.guild.name}**.`)
                        .addFields(
                            { name: 'Durasi', value: durationText, inline: true },
                            { name: 'Alasan', value: reason, inline: false }
                        )]
                });
            } catch (e) {
                // Can't DM user
            }

        } catch (error) {
            console.error('Error in mute command:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(colors.error)
                    .setTitle('❌ Error')
                    .setDescription('Tidak dapat mute user. Pastikan bot memiliki permission yang diperlukan.')],
                ephemeral: true
            });
        }
    }
};

function parseDuration(str) {
    const match = str.match(/^(\d+)([smhd])$/i);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers = {
        's': 1000,
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000
    };

    return value * multipliers[unit];
}
