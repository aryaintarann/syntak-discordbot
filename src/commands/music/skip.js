import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';

export default {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song')
        .setDMPermission(false),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                content: '❌ Tidak ada lagu yang sedang diputar!',
                ephemeral: true
            });
        }

        const member = interaction.member;
        if (!member.voice.channel) {
            return interaction.reply({
                content: '❌ Kamu harus berada di voice channel yang sama dengan bot!',
                ephemeral: true
            });
        }

        if (member.voice.channel.id !== interaction.guild.members.me.voice.channel?.id) {
            return interaction.reply({
                content: '❌ Kamu harus berada di voice channel yang sama dengan bot!',
                ephemeral: true
            });
        }

        const currentTrack = queue.currentTrack;
        queue.node.skip();

        return interaction.reply(`⏭️ Skipped: **${currentTrack.title}**`);
    },

    cooldown: 2
};
