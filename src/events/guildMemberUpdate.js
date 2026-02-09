import { Events } from 'discord.js';
import LoggingManager from '../utils/loggingManager.js';

export default {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        try {
            // Log role changes
            await LoggingManager.logRoleUpdate(oldMember, newMember);

            // Existing Timeout Detection Logic 
            // (Preserved from previous implementation)
            if (oldMember.communicationDisabledUntil && !newMember.communicationDisabledUntil) {
                // Timeout was removed
                const now = Date.now();
                const timeoutEndTime = oldMember.communicationDisabledUntil.getTime();

                // Check if timeout expired naturally (not manually removed by moderator)
                // Allow 5 second grace period for timing differences
                const expiredNaturally = timeoutEndTime <= (now + 5000);

                if (expiredNaturally) {
                    // Send DM notification to user
                    try {
                        await newMember.user.send(
                            `✅ **Timeout Berakhir**\n\n` +
                            `Timeout Anda di server **${newMember.guild.name}** telah berakhir.\n` +
                            `Anda sekarang dapat mengirim pesan kembali.\n\n` +
                            `Harap patuhi aturan server untuk menghindari pelanggaran di masa depan.`
                        );
                    } catch (dmError) {
                        // User has DMs disabled or blocked the bot
                        console.log(`⚠️ [DM FAILED] Could not send timeout expiry DM to ${newMember.user.tag}: ${dmError.message}`);
                    }
                }
            }

        } catch (error) {
            console.error('Error in guildMemberUpdate event:', error);
        }
    }
};
