import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET /api/guilds/[id]/tickets
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
        const [rows] = await pool.query('SELECT * FROM ticket_config WHERE guild_id = ?', [id])
        const config = (rows as any[])[0] || {}

        return NextResponse.json(config)
    } catch (error) {
        console.error('Error fetching ticket config:', error)
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
    }
}

// PUT /api/guilds/[id]/tickets (Update Config)
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
        const { category_id, transcript_channel_id, welcome_message, staff_role_id } = body

        await pool.query(`
            INSERT INTO ticket_config (guild_id, category_id, transcript_channel_id, welcome_message, staff_role_id)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            category_id = VALUES(category_id),
            transcript_channel_id = VALUES(transcript_channel_id),
            welcome_message = VALUES(welcome_message),
            staff_role_id = VALUES(staff_role_id)
        `, [id, category_id, transcript_channel_id, welcome_message, staff_role_id])

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error saving ticket config:', error)
        return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
    }
}

// POST /api/guilds/[id]/tickets (Send Panel)
export async function POST(
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
        const { channel_id, embed_title, embed_desc } = body
        const botToken = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN

        // We need to send a message via Discord API
        // This message should have a Button component

        const payload = {
            embeds: [{
                title: embed_title || 'Support Tickets',
                description: embed_desc || 'Click the button below to open a ticket.',
                color: 0x5865F2
            }],
            components: [{
                type: 1, // Action Row
                components: [{
                    type: 2, // Button
                    style: 1, // Primary
                    label: '📩 Open Ticket',
                    custom_id: 'create_ticket'
                }]
            }]
        }

        const res = await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (!res.ok) {
            const error = await res.json()
            console.error('Discord API Error:', error)
            return NextResponse.json({ error: 'Failed to send panel' }, { status: res.status })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error sending ticket panel:', error)
        return NextResponse.json({ error: 'Failed to send panel' }, { status: 500 })
    }
}
