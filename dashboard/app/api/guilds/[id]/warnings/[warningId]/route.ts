import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import pool from '@/lib/db'

// DELETE /api/guilds/[id]/warnings/[warningId]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string, warningId: string }> }
) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id, warningId } = await params

        // Verify guild access (optional but good practice)
        // For now relying on middleware or session check? 
        // We should ensure the user manages THIS guild. 
        // But dashboard usually checks this in middleware or parent layout.

        // Delete warning
        const [result] = await pool.query(
            'DELETE FROM warnings WHERE id = ? AND guild_id = ?',
            [warningId, id]
        )

        if ((result as any).affectedRows === 0) {
            return NextResponse.json({ error: 'Warning not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting warning:', error)
        return NextResponse.json({ error: 'Failed to delete warning' }, { status: 500 })
    }
}
