import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

// GET /api/guilds/[id]/roles
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

        const res = await fetch(`https://discord.com/api/v10/guilds/${id}/roles`, {
            headers: { Authorization: `Bot ${botToken}` }
        })

        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to fetch roles' }, { status: res.status })
        }

        const roles = await res.json()

        const serialized = roles.map((r: any) => ({
            id: r.id,
            name: r.name,
            color: r.color,
            position: r.position
        })).sort((a: any, b: any) => b.position - a.position) // High position first

        return NextResponse.json(serialized)
    } catch (error) {
        console.error('Error fetching roles:', error)
        return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
    }
}
