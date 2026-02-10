import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET /api/guilds/[id]/welcomer
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
        const [rows] = await pool.query('SELECT * FROM welcomer_config WHERE guild_id = ?', [id])
        const config = (rows as any[])[0] || {
            welcome_enabled: 0, welcome_message: '', welcome_background_url: '', welcome_channel_id: '',
            goodbye_enabled: 0, goodbye_message: '', goodbye_background_url: '', goodbye_channel_id: ''
        }

        return NextResponse.json({
            ...config,
            welcome_enabled: !!config.welcome_enabled,
            goodbye_enabled: !!config.goodbye_enabled
        })
    } catch (error) {
        console.error('Error fetching welcomer config:', error)
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
    }
}

// PUT /api/guilds/[id]/welcomer (Update Config)
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
        const {
            welcome_channel_id, welcome_message, welcome_background_url, welcome_enabled,
            goodbye_channel_id, goodbye_message, goodbye_background_url, goodbye_enabled
        } = body

        await pool.query(`
            INSERT INTO welcomer_config (
                guild_id, 
                welcome_channel_id, welcome_message, welcome_background_url, welcome_enabled,
                goodbye_channel_id, goodbye_message, goodbye_background_url, goodbye_enabled
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            welcome_channel_id = VALUES(welcome_channel_id),
            welcome_message = VALUES(welcome_message),
            welcome_background_url = VALUES(welcome_background_url),
            welcome_enabled = VALUES(welcome_enabled),
            goodbye_channel_id = VALUES(goodbye_channel_id),
            goodbye_message = VALUES(goodbye_message),
            goodbye_background_url = VALUES(goodbye_background_url),
            goodbye_enabled = VALUES(goodbye_enabled)
        `, [
            id,
            welcome_channel_id, welcome_message, welcome_background_url, welcome_enabled ? 1 : 0,
            goodbye_channel_id, goodbye_message, goodbye_background_url, goodbye_enabled ? 1 : 0
        ])

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error saving welcomer config:', error)
        return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
    }
}
