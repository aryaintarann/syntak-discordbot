import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET /api/guilds/[id] - Get guild configuration
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

        // Fetch guild config from database
        const [rows] = await pool.query(
            'SELECT * FROM guild_config WHERE guild_id = ?',
            [id]
        )

        const config = (rows as any[])[0] || null

        return NextResponse.json(config)
    } catch (error) {
        console.error('Error fetching guild config:', error)
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
    }
}

// PUT /api/guilds/[id] - Update guild configuration
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

        // Update guild config - support all fields
        const {
            mod_log_channel,
            auto_mod_enabled,
            raid_protection_enabled,
            max_warnings,
            auto_action
        } = body

        // Validate inputs
        if (max_warnings !== undefined && (max_warnings < 1 || max_warnings > 10)) {
            return NextResponse.json({ error: 'Max warnings must be between 1 and 10' }, { status: 400 })
        }

        if (auto_action && !['timeout', 'kick', 'ban'].includes(auto_action)) {
            return NextResponse.json({ error: 'Invalid auto action' }, { status: 400 })
        }

        await pool.query(
            `INSERT INTO guild_config 
                (guild_id, mod_log_channel, auto_mod_enabled, raid_protection_enabled, max_warnings, auto_action)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
               mod_log_channel = VALUES(mod_log_channel),
               auto_mod_enabled = VALUES(auto_mod_enabled),
               raid_protection_enabled = VALUES(raid_protection_enabled),
               max_warnings = VALUES(max_warnings),
               auto_action = VALUES(auto_action)`,
            [
                id,
                mod_log_channel || null,
                auto_mod_enabled !== undefined ? auto_mod_enabled : 1,
                raid_protection_enabled !== undefined ? raid_protection_enabled : 1,
                max_warnings || 3,
                auto_action || 'timeout'
            ]
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating guild config:', error)
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
    }
}
