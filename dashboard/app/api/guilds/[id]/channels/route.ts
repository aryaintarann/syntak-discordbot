import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

// GET /api/guilds/[id]/channels
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

        const res = await fetch(`https://discord.com/api/v10/guilds/${id}/channels`, {
            headers: { Authorization: `Bot ${botToken}` }
        })

        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to fetch channels' }, { status: res.status })
        }

        const channels = await res.json()
        // Filter text (0) and category (4) channels mostly
        // For ticket panel, we need text channels.
        // For ticket category, we need category channels.
        // We return all and let frontend filter.

        const serialized = channels.map((c: any) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            position: c.position
        })).sort((a: any, b: any) => a.position - b.position)

        return NextResponse.json(serialized)
    } catch (error) {
        console.error('Error fetching channels:', error)
        return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 })
    }
}
