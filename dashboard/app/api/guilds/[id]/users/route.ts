import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

// GET /api/guilds/[id]/users
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

        if (!botToken) {
            return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 })
        }

        // Fetch members from Discord API
        // Note: limit is max 1000 per request. 
        const res = await fetch(`https://discord.com/api/v10/guilds/${id}/members?limit=50`, {
            headers: {
                Authorization: `Bot ${botToken}`
            }
        })

        if (!res.ok) {
            const error = await res.json()
            console.error('Discord API Error:', error)
            return NextResponse.json({ error: 'Failed to fetch members from Discord' }, { status: res.status })
        }

        const members = await res.json()

        // Serialize data for frontend
        const serialized = members.map((m: any) => ({
            id: m.user.id,
            username: m.user.username,
            avatar: m.user.avatar
                ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png`
                : 'https://cdn.discordapp.com/embed/avatars/0.png',
            joinedAt: m.joined_at,
            roles: m.roles, // IDs
        }))

        return NextResponse.json(serialized)
    } catch (error) {
        console.error('Error fetching users:', error)
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
}
