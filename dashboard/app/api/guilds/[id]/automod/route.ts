import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET /api/guilds/[id]/automod - Get automod configuration
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        // Fetch guild config
        const [rows] = await pool.query(
            'SELECT config_data, auto_mod_enabled FROM guild_config WHERE guild_id = ?',
            [id]
        )

        const config = (rows as any[])[0]

        if (!config) {
            return NextResponse.json({
                enabled: true,
                badWords: [],
                spam: {
                    messageThreshold: 5,
                    timeWindow: 5
                },
                filters: {
                    linkSpam: { enabled: true, exemptChannels: [] },
                    massMention: { enabled: true, exemptChannels: [] },
                    inviteLinks: { enabled: true, exemptChannels: [] },
                    caps: { enabled: false, exemptChannels: [] }
                }
            })
        }

        // Parse config_data JSON
        let automodConfig = {
            enabled: !!config.auto_mod_enabled,
            badWords: [],
            spam: {
                messageThreshold: 5,
                timeWindow: 5
            },
            filters: {
                linkSpam: { enabled: true, exemptChannels: [] },
                massMention: { enabled: true, exemptChannels: [] },
                inviteLinks: { enabled: true, exemptChannels: [] },
                caps: { enabled: false, exemptChannels: [] }

            },
            duplicateDetection: {
                enabled: false,
                threshold: 3,
                timeWindow: 60
            },
            emojiSpam: {
                enabled: false,
                maxEmojis: 10
            },
            newlineSpam: {
                enabled: false,
                maxNewlines: 10
            },
            regexFilters: [],
            escalatingPunishment: {
                enabled: false,
                thresholds: { warnToTimeout: 3 },
                timeoutDuration: 600
            }
        }

        if (config.config_data) {
            try {
                const parsed = typeof config.config_data === 'string'
                    ? JSON.parse(config.config_data)
                    : config.config_data

                if (parsed.automod) {
                    if (parsed.automod.badWords) automodConfig.badWords = parsed.automod.badWords
                    if (parsed.automod.spam) automodConfig.spam = parsed.automod.spam
                    if (parsed.automod.duplicateDetection) automodConfig.duplicateDetection = parsed.automod.duplicateDetection
                    if (parsed.automod.emojiSpam) automodConfig.emojiSpam = parsed.automod.emojiSpam
                    if (parsed.automod.newlineSpam) automodConfig.newlineSpam = parsed.automod.newlineSpam
                    if (parsed.automod.regexFilters) automodConfig.regexFilters = parsed.automod.regexFilters
                    if (parsed.automod.escalatingPunishment) automodConfig.escalatingPunishment = parsed.automod.escalatingPunishment

                    // Handle filters - check if new structure or old
                    if (parsed.automod.filters) {
                        const f = parsed.automod.filters
                        // New structure has enabled + exemptChannels
                        if (typeof f.linkSpam === 'object' && 'enabled' in f.linkSpam) {
                            automodConfig.filters = f
                        }
                        // Old structure was just boolean
                        else {
                            automodConfig.filters = {
                                linkSpam: { enabled: f.linkSpam !== false, exemptChannels: [] },
                                massMention: { enabled: f.massMention !== false, exemptChannels: [] },
                                inviteLinks: { enabled: f.inviteLinks !== false, exemptChannels: [] },
                                caps: { enabled: f.caps === true, exemptChannels: [] }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('Error parsing config_data:', e)
            }
        }

        return NextResponse.json(automodConfig)
    } catch (error) {
        console.error('Error fetching automod config:', error)
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
    }
}

// PUT /api/guilds/[id]/automod - Update automod configuration
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()

        const { enabled, badWords, spam, filters, duplicateDetection, emojiSpam, newlineSpam, regexFilters } = body

        // Validate inputs
        if (badWords && !Array.isArray(badWords)) {
            return NextResponse.json({ error: 'Bad words must be an array' }, { status: 400 })
        }

        if (spam?.messageThreshold && (spam.messageThreshold < 1 || spam.messageThreshold > 20)) {
            return NextResponse.json({ error: 'Message threshold must be between 1 and 20' }, { status: 400 })
        }

        if (spam?.timeWindow && (spam.timeWindow < 1 || spam.timeWindow > 60)) {
            return NextResponse.json({ error: 'Time window must be between 1 and 60 seconds' }, { status: 400 })
        }

        // Get existing config_data
        const [rows] = await pool.query(
            'SELECT config_data FROM guild_config WHERE guild_id = ?',
            [id]
        )

        let configData: any = {}
        if (rows && (rows as any[]).length > 0 && (rows as any[])[0].config_data) {
            try {
                configData = typeof (rows as any[])[0].config_data === 'string'
                    ? JSON.parse((rows as any[])[0].config_data)
                    : (rows as any[])[0].config_data
            } catch (e) {
                console.error('Error parsing existing config_data:', e)
            }
        }

        // Update automod section
        configData.automod = {
            badWords: badWords || [],
            spam: spam || { messageThreshold: 5, timeWindow: 5 },
            filters: filters || {
                linkSpam: { enabled: true, exemptChannels: [] },
                massMention: { enabled: true, exemptChannels: [] },
                inviteLinks: { enabled: true, exemptChannels: [] },
                caps: { enabled: false, exemptChannels: [] }
            },
            duplicateDetection: duplicateDetection || { enabled: false, threshold: 3, timeWindow: 60 },
            emojiSpam: emojiSpam || { enabled: false, maxEmojis: 10 },
            newlineSpam: newlineSpam || { enabled: false, maxNewlines: 10 },
            regexFilters: regexFilters || [],
            escalatingPunishment: body.escalatingPunishment || { enabled: false, thresholds: { warnToTimeout: 3 }, timeoutDuration: 600 }
        }

        // Save to database - also update auto_mod_enabled
        await pool.query(
            `INSERT INTO guild_config (guild_id, config_data, auto_mod_enabled)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE 
               config_data = VALUES(config_data),
               auto_mod_enabled = VALUES(auto_mod_enabled)`,
            [id, JSON.stringify(configData), enabled !== undefined ? (enabled ? 1 : 0) : 1]
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating automod config:', error)
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
    }
}
