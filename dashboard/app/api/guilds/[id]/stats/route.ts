import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET /api/guilds/[id]/stats
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
        const botToken = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN

        let memberCount = 0
        let onlineCount = 0

        if (botToken) {
            try {
                const res = await fetch(`https://discord.com/api/v10/guilds/${id}?with_counts=true`, {
                    headers: { Authorization: `Bot ${botToken}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    memberCount = data.approximate_member_count || 0
                    onlineCount = data.approximate_presence_count || 0
                }
            } catch (e) {
                console.error('Failed to fetch guild stats from Discord:', e)
            }
        }

        // DB stats
        const [warnRows] = await pool.query('SELECT COUNT(*) as c FROM warnings WHERE guild_id = ?', [id])
        const [logRows] = await pool.query('SELECT COUNT(*) as c FROM mod_logs WHERE guild_id = ?', [id])
        const [configRows] = await pool.query('SELECT COUNT(*) as c FROM guild_config WHERE auto_mod_enabled = 1', [])

        return NextResponse.json({
            memberCount,
            onlineCount,
            warningCount: (warnRows as any[])[0].c,
            logCount: (logRows as any[])[0].c
        })
    } catch (error) {
        console.error('Error fetching stats:', error)
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
}
