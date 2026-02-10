'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { toast } from 'react-hot-toast'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

interface GuildInfo {
    id: string
    name: string
    icon: string | null
}

interface Channel {
    id: string
    name: string
    type: number
}

interface Role {
    id: string
    name: string
    color: number
}

interface RRItem {
    id: string
    label: string
    emoji: string
    style: number
}

export default function ReactionRolesPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const params = useParams()
    const serverId = params.id as string

    const [guildInfo, setGuildInfo] = useState<GuildInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Data
    const [channels, setChannels] = useState<Channel[]>([])
    const [roles, setRoles] = useState<Role[]>([])

    // Form
    const [targetChannel, setTargetChannel] = useState('')
    const [embedTitle, setEmbedTitle] = useState('Get Your Roles')
    const [embedDesc, setEmbedDesc] = useState('React to the emojis below to assign yourself roles.')
    const [embedColor, setEmbedColor] = useState('#5865F2')

    // RR Items
    const [rrItems, setRrItems] = useState<RRItem[]>([])

    // Active Messages
    const [activeMessages, setActiveMessages] = useState<any[]>([])

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/')
        } else if (status === 'authenticated') {
            fetchInitialData()
        }
    }, [status, router, serverId])

    const fetchInitialData = async () => {
        setLoading(true)
        try {
            await Promise.all([
                fetchGuildInfo(),
                fetchResources()
            ])
        } catch (error) {
            console.error('Error loading data:', error)
            toast.error('Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    const fetchGuildInfo = async () => {
        const res = await fetch('/api/guilds')
        if (res.ok) {
            const guilds = await res.json()
            const guild = guilds.find((g: any) => g.id === serverId)
            if (guild) setGuildInfo(guild)
        }
    }

    const fetchResources = async () => {
        const [resCh, resRoles, resRR] = await Promise.all([
            fetch(`/api/guilds/${serverId}/channels`),
            fetch(`/api/guilds/${serverId}/roles`),
            fetch(`/api/guilds/${serverId}/reaction-roles`)
        ])

        if (resCh.ok) setChannels(await resCh.json())
        if (resRoles.ok) setRoles(await resRoles.json())
        if (resRR.ok) {
            const rawRR = await resRR.json()
            // Group by message_id
            const grouped = rawRR.reduce((acc: any, curr: any) => {
                if (!acc[curr.message_id]) {
                    acc[curr.message_id] = {
                        message_id: curr.message_id,
                        channel_id: curr.channel_id,
                        roles: []
                    }
                }
                acc[curr.message_id].roles.push(curr)
                return acc
            }, {})
            setActiveMessages(Object.values(grouped))
        }
    }

    const handleDelete = async (messageId: string) => {
        if (!confirm('Are you sure you want to delete this reaction role message? (The message on Discord will NOT be deleted, only the database entry)')) return

        try {
            const res = await fetch(`/api/guilds/${serverId}/reaction-roles?message_id=${messageId}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                toast.success('Deleted successfully')
                fetchResources() // Refresh list
            } else {
                toast.error('Failed to delete')
            }
        } catch (e) {
            toast.error('Error deleting')
        }
    }

    const handleAddItem = () => {
        setRrItems([...rrItems, { id: '', label: '', emoji: '', style: 1 }])
    }

    const handleRemoveItem = (index: number) => {
        const newItems = [...rrItems]
        newItems.splice(index, 1)
        setRrItems(newItems)
    }

    const handleItemChange = (index: number, field: keyof RRItem, value: any) => {
        const newItems = [...rrItems]
        newItems[index] = { ...newItems[index], [field]: value }
        setRrItems(newItems)
    }

    const handleCreate = async () => {
        if (!targetChannel) {
            toast.error('Please select a channel')
            return
        }
        if (rrItems.length === 0) {
            toast.error('Please add at least one role')
            return
        }
        if (rrItems.some(i => !i.id)) {
            toast.error('Please select a role for all items')
            return
        }

        setSaving(true)
        try {
            const res = await fetch(`/api/guilds/${serverId}/reaction-roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel_id: targetChannel,
                    embed_title: embedTitle,
                    embed_desc: embedDesc,
                    embed_color: embedColor,
                    roles: rrItems
                })
            })

            if (res.ok) {
                toast.success('Reaction Role message created!')
                // Reset form
                setRrItems([])
                setEmbedTitle('Get Your Roles')
                fetchResources() // Refresh active list
            } else {
                const err = await res.json()
                toast.error(err.error || 'Failed to create')
            }
        } catch (e) {
            toast.error('Error creating reaction role')
        } finally {
            setSaving(false)
        }
    }

    const textChannels = channels.filter(c => c.type === 0)

    if (loading) return <div className="text-white">Loading...</div>

    return (
        <div className="flex h-screen bg-[#0f0e17] overflow-hidden">
            <Sidebar serverId={serverId} serverName={guildInfo?.name} serverIcon={guildInfo?.icon} />

            <div className="flex-1 overflow-auto lg:pl-64">
                <header className="bg-[#0f0e17]/50 backdrop-blur-md border-b border-white/10 p-6 sticky top-0 z-10">
                    <h1 className="text-3xl font-bold text-white">Reaction Roles</h1>
                    <p className="text-purple-200">Create self-assignable role menus.</p>
                </header>

                <main className="p-6 max-w-4xl mx-auto space-y-8">
                    {/* Active Messages List */}
                    {activeMessages.length > 0 && (
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                            <h2 className="text-xl font-bold text-white mb-4">Active Reaction Roles</h2>
                            <div className="grid gap-4">
                                {activeMessages.map((msg) => (
                                    <div key={msg.message_id} className="bg-black/20 p-4 rounded-lg border border-white/5 flex justify-between items-center">
                                        <div>
                                            <p className="text-white font-semibold">
                                                Channel: #{channels.find(c => c.id === msg.channel_id)?.name || msg.channel_id}
                                            </p>
                                            <p className="text-gray-400 text-sm">Message ID: {msg.message_id}</p>
                                            <div className="flex gap-2 mt-2">
                                                {msg.roles.map((r: any, idx: number) => (
                                                    <span key={`${msg.message_id}-${r.role_id}-${idx}`} className="px-2 py-1 bg-white/10 rounded text-xs text-purple-200">
                                                        {r.emoji} {roles.find(role => role.id === r.role_id)?.name || 'Unknown Role'}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(msg.message_id)}
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                            title="Delete Database Entry"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Create New Menu</h2>

                        <div className="grid gap-6">
                            {/* Channel */}
                            <div>
                                <label className="block text-purple-200 mb-2">Target Channel</label>
                                <select
                                    value={targetChannel}
                                    onChange={(e) => setTargetChannel(e.target.value)}
                                    className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white appearance-none"
                                >
                                    <option value="">Select a Channel</option>
                                    {textChannels.map(c => (
                                        <option key={c.id} value={c.id}>#{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Embed Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-purple-200 mb-2">Embed Title</label>
                                    <input
                                        type="text" value={embedTitle} onChange={(e) => setEmbedTitle(e.target.value)}
                                        className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-purple-200 mb-2">Color (Hex)</label>
                                    <input
                                        type="text" value={embedColor} onChange={(e) => setEmbedColor(e.target.value)}
                                        className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-purple-200 mb-2">Description</label>
                                <textarea
                                    value={embedDesc} onChange={(e) => setEmbedDesc(e.target.value)}
                                    className="w-full h-20 px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white"
                                />
                            </div>

                            {/* Role Items */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-purple-200">Roles</label>
                                    <button
                                        onClick={handleAddItem}
                                        className="flex items-center gap-1 text-sm bg-indigo-600 px-3 py-1 rounded hover:bg-indigo-700 text-white"
                                    >
                                        <PlusIcon className="w-4 h-4" /> Add Role
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {rrItems.map((item, index) => (
                                        <div key={index} className="flex gap-2 items-start bg-black/20 p-3 rounded-lg border border-white/5">
                                            <div className="flex-1 space-y-2">
                                                <select
                                                    value={item.id}
                                                    onChange={(e) => handleItemChange(index, 'id', e.target.value)}
                                                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded text-white appearance-none text-sm"
                                                >
                                                    <option value="">Select Role</option>
                                                    {roles.map(r => (
                                                        <option key={r.id} value={r.id} style={{ color: r.color ? `#${r.color.toString(16)}` : undefined }}>
                                                            {r.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <input
                                                            type="text" placeholder="Emoji (e.g. 🦊 or :custom_emoji:)"
                                                            value={item.emoji} onChange={(e) => handleItemChange(index, 'emoji', e.target.value)}
                                                            className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded text-white text-sm"
                                                        />
                                                        <span className="absolute right-3 top-2.5 text-xs text-gray-500">
                                                            {item.emoji ? '✅' : 'Required'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveItem(index)}
                                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                    {rrItems.length === 0 && <p className="text-gray-500 text-sm italic">No roles added yet.</p>}
                                </div>
                            </div>

                            <button
                                onClick={handleCreate}
                                disabled={saving}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg transition-all"
                            >
                                {saving ? 'Creating...' : '🚀 Create Reaction Role Message'}
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
