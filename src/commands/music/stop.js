import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';

export default {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music and clear the queue')
        .setDMPermission(false),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);

        if (!queue) {
            return interaction.reply({
                content: '❌ Tidak ada lagu yang sedang diputar!',
                ephemeral: true
            });
        }

        const member = interaction.member;
        if (!member.voice.channel || member.voice.channel.id !== interaction.guild.members.me.voice.channel?.id) {
            return interaction.reply({
                content: '❌ Kamu harus berada di voice channel yang sama dengan bot!',
                ephemeral: true
            });
        }

        queue.delete();

        return interaction.reply('⏹️ Music stopped and queue cleared!');
    },

    cooldown: 2
};
