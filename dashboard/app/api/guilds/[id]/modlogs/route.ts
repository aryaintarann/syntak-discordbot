import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET /api/guilds/[id]/modlogs
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

        // Parse query params for pagination
        const url = new URL(request.url)
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const offset = parseInt(url.searchParams.get('offset') || '0')

        // Fetch mod logs
        const [rows] = await pool.query(
            'SELECT * FROM mod_logs WHERE guild_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
            [id, limit, offset]
        )

        // Get total count for pagination
        const [countRows] = await pool.query(
            'SELECT COUNT(*) as total FROM mod_logs WHERE guild_id = ?',
            [id]
        )
        const total = (countRows as any[])[0].total

        return NextResponse.json({
            logs: rows,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total
            }
        })
    } catch (error) {
        console.error('Error fetching mod logs:', error)
        return NextResponse.json({ error: 'Failed to fetch mod logs' }, { status: 500 })
    }
}
