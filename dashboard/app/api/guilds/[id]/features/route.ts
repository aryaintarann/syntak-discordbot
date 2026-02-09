import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import pool from '@/lib/db'

// Default feature configuration
function getDefaultConfig() {
    return {
        features: {
            moderation: {
                purge: { enabled: true },
                slowmode: { enabled: true },
                mute: { enabled: true },
                history: { enabled: true },
                note: { enabled: true },
                case: { enabled: true },
                roleall: { enabled: false }
            },
            logging: {
                modLog: { enabled: false, channelId: null },
                messageLog: { enabled: false, channelId: null },
                joinLeaveLog: { enabled: false, channelId: null },
                voiceLog: { enabled: false, channelId: null },
                roleLog: { enabled: false, channelId: null }
            },
            security: {
                accountAge: { enabled: false, minDays: 7, action: 'kick' },
                verification: { enabled: false, type: 'button', channelId: null, roleId: null },
                altDetection: { enabled: false },
                phishingDetection: { enabled: true },
                autoRaidBan: { enabled: false }
            },
            automod: {
                escalatingPunishment: {
                    enabled: false,
                    thresholds: { warnToTimeout: 3, timeoutToBan: 5 }
                },
                duplicateDetection: { enabled: false, threshold: 3, timeWindow: 60 },
                emojiSpam: { enabled: false, maxEmojis: 10 },
                newlineSpam: { enabled: false, maxNewlines: 10 },
                regexFilters: []
            }
        }
    }
}

// Deep merge helper
function deepMerge(target: any, source: any): any {
    const result = { ...target }
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key] || {}, source[key])
        } else {
            result[key] = source[key]
        }
    }
    return result
}

// GET /api/guilds/[id]/features - Get feature configuration
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

        const [rows] = await pool.query(
            'SELECT config_data FROM guild_config WHERE guild_id = ?',
            [id]
        )

        const config = (rows as any[])[0]
        const defaults = getDefaultConfig()

        if (!config || !config.config_data) {
            return NextResponse.json(defaults)
        }

        try {
            const stored = typeof config.config_data === 'string'
                ? JSON.parse(config.config_data)
                : config.config_data

            // Merge stored with defaults to ensure all keys exist
            const merged = deepMerge(defaults, stored)
            return NextResponse.json(merged)
        } catch (e) {
            console.error('Error parsing config:', e)
            return NextResponse.json(defaults)
        }
    } catch (error: any) {
        console.error('Error fetching features:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PUT /api/guilds/[id]/features - Update feature configuration
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

        // Get existing config
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
                configData = {}
            }
        }

        // Update features section
        configData.features = body.features

        // Save to database
        await pool.query(
            `INSERT INTO guild_config (guild_id, config_data) 
             VALUES (?, ?) 
             ON DUPLICATE KEY UPDATE config_data = ?`,
            [id, JSON.stringify(configData), JSON.stringify(configData)]
        )

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error saving features:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
