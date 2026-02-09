import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import axios from 'axios'

// GET /api/guilds/[id]/roles - Get guild roles
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

        // Fetch roles from Discord API
        const response = await axios.get(`https://discord.com/api/guilds/${id}/roles`, {
            headers: {
                Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`
            }
        })

        // Sort by position DESC (highest role first) and exclude @everyone if needed (managed roles are bot roles)
        const roles = response.data
            .map((role: any) => ({
                id: role.id,
                name: role.name,
                color: role.color,
                position: role.position,
                managed: role.managed,
                permissions: role.permissions
            }))
            .sort((a: any, b: any) => b.position - a.position)

        return NextResponse.json(roles)
    } catch (error: any) {
        console.error('Error fetching roles:', error.response?.data || error.message)

        if (error.response?.status === 403) {
            return NextResponse.json({ error: 'Bot not in server' }, { status: 403 })
        }

        return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
    }
}
