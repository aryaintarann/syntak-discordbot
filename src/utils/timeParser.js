import ms from 'ms';

/**
 * Parse time duration string to milliseconds
 * Examples: "1h", "30m", "7d", "1w"
 */
export function parseTime(timeString) {
    try {
        const duration = ms(timeString);
        if (!duration || duration < 0) {
            throw new Error('Invalid time format');
        }
        return duration;
    } catch (error) {
        throw new Error('Format waktu tidak valid. Contoh: 1h, 30m, 7d, 1w');
    }
}

/**
 * Format milliseconds to human-readable string
 */
export function formatTime(milliseconds) {
    return ms(milliseconds, { long: true });
}

/**
 * Validate timeout duration (Discord max: 28 days)
 */
export function validateTimeoutDuration(duration) {
    const maxDuration = 28 * 24 * 60 * 60 * 1000; // 28 hari

    if (duration > maxDuration) {
        throw new Error('Durasi timeout maksimal adalah 28 hari');
    }

    if (duration < 1000) {
        throw new Error('Durasi timeout minimal adalah 1 detik');
    }

    return true;
}

/**
 * Check if duration string is valid
 */
export function isValidDuration(timeString) {
    try {
        const duration = parseTime(timeString);
        return duration > 0;
    } catch {
        return false;
    }
}
