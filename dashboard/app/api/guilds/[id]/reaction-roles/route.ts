import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import * as emojiLib from 'node-emoji'

// GET /api/guilds/[id]/reaction-roles
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
        // Only fetch active reaction role messages.
        const [rows] = await pool.query('SELECT * FROM reaction_roles WHERE guild_id = ?', [id])
        return NextResponse.json(rows)
    } catch (error) {
        console.error('Error fetching reaction roles:', error)
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }
}

// POST /api/guilds/[id]/reaction-roles (Create New)
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { channel_id, embed_title, embed_desc, embed_color, roles } = body

        if (!channel_id || !roles || roles.length === 0) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
        }

        // Create Message Payload (No Components)
        const payload = {
            embeds: [{
                title: embed_title || 'Reaction Roles',
                description: embed_desc || 'React to the emojis below to get roles!',
                color: parseInt(embed_color.replace('#', ''), 16) || 0x5865F2,
                footer: { text: 'Reaction Roles by Syntak' }
            }]
        }

        const botToken = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN

        // Send to Discord
        const res = await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (!res.ok) {
            const err = await res.json()
            console.error('Discord API Error (Send Message):', JSON.stringify(err, null, 2))
            return NextResponse.json({ error: 'Failed to send message', details: err }, { status: res.status })
        }

        const messageData = await res.json()
        const messageId = messageData.id

        // Add Reactions
        for (const role of roles) {
            if (!role.emoji) continue;

            let emoji = role.emoji.trim()

            // Try to convert shortcodes (e.g. :white_check_mark:) to unicode
            const unicode = emojiLib.get(emoji)
            if (unicode && unicode !== emoji) {
                console.log(`[ReactionRole] Converted shortcode ${emoji} to ${unicode}`)
                emoji = unicode
                role.emoji = unicode // Update for DB storage
            }

            // Handle custom emoji format <:name:id> or <a:name:id>
            const customEmojiMatch = emoji.match(/<a?:(.+?):(\d+)>/)
            if (customEmojiMatch) {
                emoji = `${customEmojiMatch[1]}:${customEmojiMatch[2]}`
            }

            const emojiEncoded = encodeURIComponent(emoji)

            console.log(`[ReactionRole] Adding reaction: ${emoji} (Encoded: ${emojiEncoded}) to message ${messageId}`)

            const reactionRes = await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages/${messageId}/reactions/${emojiEncoded}/@me`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bot ${botToken}`
                }
            })

            if (!reactionRes.ok) {
                const errorBody = await reactionRes.text()
                console.error(`[ReactionRole] Failed to react with ${emoji}: ${reactionRes.status} - ${errorBody}`)
            } else {
                console.log(`[ReactionRole] Successfully added reaction: ${emoji}`)
            }

            // Small delay to prevent rate limits
            await new Promise(resolve => setTimeout(resolve, 500))
        }

        // Save to DB (Insert multiple rows)
        const dbValues = roles.map((role: any) => [id, messageId, channel_id, role.emoji, role.id])

        if (dbValues.length > 0) {
            await pool.query(
                'INSERT INTO reaction_roles (guild_id, message_id, channel_id, emoji, role_id) VALUES ?',
                [dbValues]
            )
        }

        return NextResponse.json({ success: true, messageId })
    } catch (error) {
        console.error('Error creating reaction role:', error)
        return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
    }
}

// DELETE /api/guilds/[id]/reaction-roles?message_id=...
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const messageId = searchParams.get('message_id')

        if (!messageId) {
            return NextResponse.json({ error: 'Missing message_id' }, { status: 400 })
        }

        const { id } = await params

        // Delete from DB
        await pool.query(
            'DELETE FROM reaction_roles WHERE guild_id = ? AND message_id = ?',
            [id, messageId]
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting reaction role:', error)
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }
}
