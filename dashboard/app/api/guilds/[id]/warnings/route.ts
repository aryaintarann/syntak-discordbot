import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET /api/guilds/[id]/warnings
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

        // Fetch all warnings
        // TODO: Pagination if needed, for now just fetch recent 100
        const [rows] = await pool.query(
            'SELECT * FROM warnings WHERE guild_id = ? ORDER BY timestamp DESC LIMIT 100',
            [id]
        )

        return NextResponse.json(rows)
    } catch (error) {
        console.error('Error fetching warnings:', error)
        return NextResponse.json({ error: 'Failed to fetch warnings' }, { status: 500 })
    }
}
