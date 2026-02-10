import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET /api/guilds/[id]/giveaways (Active only)
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
        const url = new URL(request.url)
        const view = url.searchParams.get('view') || 'active'

        let query = 'SELECT * FROM giveaways WHERE guild_id = ?'
        const queryParams = [id]

        if (view === 'history') {
            query += ' AND ended = 1 ORDER BY end_time DESC LIMIT 50'
        } else {
            query += ' AND ended = 0 ORDER BY end_time ASC'
        }

        const [rows] = await pool.query(query, queryParams)
        return NextResponse.json(rows)
    } catch (error) {
        console.error('Error fetching giveaways:', error)
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }
}

// POST /api/guilds/[id]/giveaways (Create)
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { id } = await params
        const body = await request.json()
        const { channel_id, prize, winners_count, duration_minutes } = body

        if (!channel_id || !prize || !winners_count || !duration_minutes) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
        }

        const endTime = Date.now() + (duration_minutes * 60 * 1000)
        const botToken = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN

        // Send Message
        const payload = {
            embeds: [{
                title: '🎉 GIVEAWAY 🎉',
                description: `**Prize:** ${prize}\n**Winners:** ${winners_count}\n**Ends:** <t:${Math.floor(endTime / 1000)}:R>\n\nClick the button below to enter!`,
                color: 0xFF0000,
                footer: { text: `Hosted by Dashboard` }
            }],
            components: [{
                type: 1,
                components: [{
                    type: 2,
                    style: 3, // Success
                    label: '🎉 Join Giveaway',
                    custom_id: 'giveaway_join'
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
            const err = await res.json()
            console.error('Discord API Error:', err)
            return NextResponse.json({ error: 'Failed to send message' }, { status: res.status })
        }

        const messageData = await res.json()

        // Save to DB
        await pool.query(
            'INSERT INTO giveaways (guild_id, channel_id, message_id, prize, end_time, winners_count, host_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, channel_id, messageData.id, prize, endTime, winners_count, 'dashboard']
        )

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error creating giveaway:', error)
        return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
    }
}
