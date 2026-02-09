import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import axios from 'axios'

// GET /api/guilds/[id]/channels - Get guild channels
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session || !session.accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        // Fetch channels from Discord API
        const response = await axios.get(`https://discord.com/api/guilds/${id}/channels`, {
            headers: {
                Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`
            }
        })

        // Filter to only text channels (type 0) and categories (type 4)
        const channels = response.data
            .filter((channel: any) => channel.type === 0 || channel.type === 5) // 0 = GUILD_TEXT, 5 = GUILD_ANNOUNCEMENT
            .map((channel: any) => ({
                id: channel.id,
                name: channel.name,
                type: channel.type,
                position: channel.position,
                parent_id: channel.parent_id
            }))
            .sort((a: any, b: any) => a.position - b.position)

        return NextResponse.json(channels)
    } catch (error: any) {
        console.error('Error fetching channels:', error.response?.data || error.message)

        if (error.response?.status === 403) {
            return NextResponse.json({ error: 'Bot not in server' }, { status: 403 })
        }

        return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 })
    }
}
