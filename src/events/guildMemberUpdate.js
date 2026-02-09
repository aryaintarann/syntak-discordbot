import { Events } from 'discord.js';

export default {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        try {
            console.log(`[GuildMemberUpdate] Event triggered for ${newMember.user.tag}`);

            // Debug: Show what changed
            console.log(`[DEBUG] Old communicationDisabledUntil: ${oldMember.communicationDisabledUntil}`);
            console.log(`[DEBUG] New communicationDisabledUntil: ${newMember.communicationDisabledUntil}`);
            console.log(`[DEBUG] Old value type: ${typeof oldMember.communicationDisabledUntil}`);
            console.log(`[DEBUG] New value type: ${typeof newMember.communicationDisabledUntil}`);
            console.log(`[DEBUG] Condition check: oldMember.communicationDisabledUntil=${!!oldMember.communicationDisabledUntil}, newMember.communicationDisabledUntil=${!!newMember.communicationDisabledUntil}`);

            // Check if timeout status changed
            if (oldMember.communicationDisabledUntil && !newMember.communicationDisabledUntil) {
                console.log(`[Timeout Detection] ✅ ${newMember.user.tag} timeout status changed`);
                console.log(`[Timeout Detection] Old timeout: ${oldMember.communicationDisabledUntil}`);
                console.log(`[Timeout Detection] New timeout: ${newMember.communicationDisabledUntil}`);

                // Timeout was removed
                const now = Date.now();
                const timeoutEndTime = oldMember.communicationDisabledUntil.getTime();

                console.log(`[Timeout Detection] Current time: ${now}`);
                console.log(`[Timeout Detection] Timeout end time: ${timeoutEndTime}`);
                console.log(`[Timeout Detection] Difference: ${timeoutEndTime - now}ms`);

                // Check if timeout expired naturally (not manually removed by moderator)
                // Allow 5 second grace period for timing differences
                const expiredNaturally = timeoutEndTime <= (now + 5000);

                console.log(`[Timeout Detection] Expired naturally? ${expiredNaturally}`);

                if (expiredNaturally) {
                    console.log(`[DM Notification] Attempting to send DM to ${newMember.user.tag}`);

                    // Send DM notification to user
                    try {
                        await newMember.user.send(
                            `✅ **Timeout Berakhir**\n\n` +
                            `Timeout Anda di server **${newMember.guild.name}** telah berakhir.\n` +
                            `Anda sekarang dapat mengirim pesan kembali.\n\n` +
                            `Harap patuhi aturan server untuk menghindari pelanggaran di masa depan.`
                        );

                        console.log(`✅ [SUCCESS] Sent timeout expiry notification to ${newMember.user.tag} in ${newMember.guild.name}`);
                    } catch (dmError) {
                        // User has DMs disabled or blocked the bot
                        console.log(`⚠️ [DM FAILED] Could not send timeout expiry DM to ${newMember.user.tag}: ${dmError.message}`);
                    }
                } else {
                    console.log(`⏭️ [SKIPPED] Timeout was manually removed by moderator (not natural expiry)`);
                }
            } else {
                console.log(`[DEBUG] ❌ Timeout condition NOT met - this is not a timeout expiry event`);
            }
        } catch (error) {
            console.error('[ERROR] Error in guildMemberUpdate event:', error);
        }
    }
};
