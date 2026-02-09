import { getExpiredTimeouts, markTimeoutNotified } from '../utils/timeoutTracker.js';

/**
 * Check for expired timeouts and send DM notifications
 */
export async function checkExpiredTimeouts(client) {
    console.log(`[Timeout Checker] === Running check cycle at ${new Date()} ===`);

    try {
        const expiredTimeouts = await getExpiredTimeouts();

        console.log(`[Timeout Checker] Received ${expiredTimeouts ? expiredTimeouts.length : 'null'} timeout(s) from database`);

        if (!expiredTimeouts || expiredTimeouts.length === 0) {
            console.log(`[Timeout Checker] No expired timeouts, ending cycle`);
            return; // No expired timeouts
        }

        console.log(`[Timeout Checker] Found ${expiredTimeouts.length} expired timeout(s)`);

        for (const timeout of expiredTimeouts) {
            try {
                const guild = await client.guilds.fetch(timeout.guild_id);
                if (!guild) {
                    console.log(`[Timeout Checker] Guild ${timeout.guild_id} not found, skipping`);
                    await markTimeoutNotified(timeout.user_id, timeout.guild_id);
                    continue;
                }

                // Force fetch fresh member data from API (not cache!)
                const member = await guild.members.fetch({ user: timeout.user_id, force: true }).catch(() => null);
                if (!member) {
                    console.log(`[Timeout Checker] Member ${timeout.user_id} not found in ${guild.name}, skipping`);
                    await markTimeoutNotified(timeout.user_id, timeout.guild_id);
                    continue;
                }

                // Check if timeout has actually expired
                const now = Date.now();
                const timeoutExpired = timeout.expiry_time <= now;

                if (!timeoutExpired) {
                    continue;
                }

                // Double-check: If member still shows as timed out in fresh data, wait for next check
                if (member.communicationDisabledUntil && member.communicationDisabledUntil.getTime() > now) {
                    console.log(`[Timeout Checker] Member ${member.user.tag} still actively timed out, will retry later`);
                    continue;
                }

                // Send DM notification
                try {
                    await member.user.send(
                        `✅ **Timeout Berakhir**\n\n` +
                        `Timeout Anda di server **${guild.name}** telah berakhir.\n` +
                        `Anda sekarang dapat mengirim pesan kembali.\n\n` +
                        `Harap patuhi aturan server untuk menghindari pelanggaran di masa depan.`
                    );

                    console.log(`✅ [SUCCESS] Sent timeout expiry notification to ${member.user.tag} in ${guild.name}`);
                } catch (dmError) {
                    console.log(`⚠️ [DM FAILED] Could not send DM to ${member.user.tag}: ${dmError.message}`);
                }

                // Mark as notified
                await markTimeoutNotified(timeout.user_id, timeout.guild_id);

            } catch (error) {
                console.error(`[Timeout Checker] Error processing timeout for user ${timeout.user_id}:`, error);
            }
        }
    } catch (error) {
        console.error('[Timeout Checker] Error checking expired timeouts:', error);
    }
}

/**
 * Start the timeout checker scheduler
 * Checks every 10 seconds for expired timeouts
 */
export function startTimeoutChecker(client) {
    console.log('⏰ Starting timeout expiry checker (10 second interval)');

    // Check immediately on start
    checkExpiredTimeouts(client);

    // Then check every 10 seconds
    setInterval(() => {
        checkExpiredTimeouts(client);
    }, 10000); // 10 seconds
}
