import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import axios from 'axios'

// GET /api/guilds - Get user's guilds where they have MANAGE_GUILD permission
export async function GET() {
    try {
        const session = await auth()

        if (!session || !session.accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch guilds from Discord API
        const response = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: {
                Authorization: `Bearer ${session.accessToken}`
            }
        })

        const guilds = response.data

        // Filter guilds where user has MANAGE_GUILD permission
        const manageable = guilds.filter((guild: any) => {
            const permissions = BigInt(guild.permissions)
            const MANAGE_GUILD = BigInt(0x20) // 32
            return (permissions & MANAGE_GUILD) === MANAGE_GUILD
        })

        // TODO: Check which guilds the bot is in
        // For now, return all manageable guilds

        return NextResponse.json(manageable)
    } catch (error) {
        console.error('Error fetching guilds:', error)
        return NextResponse.json({ error: 'Failed to fetch guilds' }, { status: 500 })
    }
}
