'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { toast } from 'react-hot-toast'

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

export default function TicketsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const params = useParams()
    const serverId = params.id as string

    const [guildInfo, setGuildInfo] = useState<GuildInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [sending, setSending] = useState(false)

    // Data
    const [channels, setChannels] = useState<Channel[]>([])
    const [roles, setRoles] = useState<Role[]>([])

    // Config Form
    const [categoryId, setCategoryId] = useState('')
    const [transcriptChannelId, setTranscriptChannelId] = useState('')
    const [supportRoleId, setSupportRoleId] = useState('')
    const [welcomeMsg, setWelcomeMsg] = useState('Welcome to support! Please describe your issue.')

    // Panel Form
    const [panelChannelId, setPanelChannelId] = useState('')
    const [panelTitle, setPanelTitle] = useState('Support Tickets')
    const [panelDesc, setPanelDesc] = useState('Click the button below to open a private ticket.')

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
                fetchConfig(),
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
            if (guild) {
                setGuildInfo({
                    id: guild.id,
                    name: guild.name,
                    icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null
                })
            }
        }
    }

    const fetchConfig = async () => {
        const res = await fetch(`/api/guilds/${serverId}/tickets`)
        if (res.ok) {
            const data = await res.json()
            if (data.category_id) setCategoryId(data.category_id)
            if (data.transcript_channel_id) setTranscriptChannelId(data.transcript_channel_id)
            if (data.staff_role_id) setSupportRoleId(data.staff_role_id)
            if (data.welcome_message) setWelcomeMsg(data.welcome_message)
        }
    }

    const fetchResources = async () => {
        const [resCh, resRoles] = await Promise.all([
            fetch(`/api/guilds/${serverId}/channels`),
            fetch(`/api/guilds/${serverId}/roles`)
        ])

        if (resCh.ok) setChannels(await resCh.json())
        if (resRoles.ok) setRoles(await resRoles.json())
    }

    const handleSaveConfig = async () => {
        setSaving(true)
        try {
            const res = await fetch(`/api/guilds/${serverId}/tickets`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category_id: categoryId,
                    transcript_channel_id: transcriptChannelId,
                    staff_role_id: supportRoleId,
                    welcome_message: welcomeMsg
                })
            })

            if (res.ok) {
                toast.success('Configuration saved!')
            } else {
                toast.error('Failed to save configuration')
            }
        } catch (e) {
            toast.error('Error saving configuration')
        } finally {
            setSaving(false)
        }
    }

    const handleSendPanel = async () => {
        if (!panelChannelId) {
            toast.error('Please select a channel')
            return
        }
        setSending(true)
        try {
            const res = await fetch(`/api/guilds/${serverId}/tickets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel_id: panelChannelId,
                    embed_title: panelTitle,
                    embed_desc: panelDesc
                })
            })

            if (res.ok) {
                toast.success('Ticket panel sent!')
            } else {
                const err = await res.json()
                toast.error(err.error || 'Failed to send panel')
            }
        } catch (e) {
            toast.error('Error sending panel')
        } finally {
            setSending(false)
        }
    }

    // Filter channels
    const textChannels = channels.filter(c => c.type === 0)
    const categoryChannels = channels.filter(c => c.type === 4)

    if (loading) {
        return (
            <div className="flex h-screen bg-[#0f0e17]">
                <Sidebar serverId={serverId} serverName={guildInfo?.name} serverIcon={guildInfo?.icon} />
                <div className="flex-1 lg:pl-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-[#0f0e17] overflow-hidden">
            <Sidebar serverId={serverId} serverName={guildInfo?.name} serverIcon={guildInfo?.icon} />

            <div className="flex-1 overflow-auto lg:pl-64">
                <header className="bg-[#0f0e17]/50 backdrop-blur-md border-b border-white/10 p-6 sticky top-0 z-10">
                    <h1 className="text-3xl font-bold text-white">Ticket System</h1>
                    <p className="text-purple-200">Manage support tickets and settings</p>
                </header>

                <main className="p-6 max-w-4xl mx-auto space-y-8">

                    {/* Configuration Section */}
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            ⚙️ Global Settings
                        </h2>

                        <div className="grid gap-6">
                            {/* Ticket Category */}
                            <div>
                                <label className="block text-purple-200 mb-2">Ticket Category</label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white appearance-none"
                                >
                                    <option value="">Select a Category</option>
                                    {categoryChannels.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-purple-300 mt-1">Where new ticket channels will be created.</p>
                            </div>

                            {/* Transcript Channel */}
                            <div>
                                <label className="block text-purple-200 mb-2">Transcript Log Channel</label>
                                <select
                                    value={transcriptChannelId}
                                    onChange={(e) => setTranscriptChannelId(e.target.value)}
                                    className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white appearance-none"
                                >
                                    <option value="">Select a Channel</option>
                                    {textChannels.map(c => (
                                        <option key={c.id} value={c.id}>#{c.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-purple-300 mt-1">Where closed ticket transcripts will be sent.</p>
                            </div>

                            {/* Support Role */}
                            <div>
                                <label className="block text-purple-200 mb-2">Support Staff Role</label>
                                <select
                                    value={supportRoleId}
                                    onChange={(e) => setSupportRoleId(e.target.value)}
                                    className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white appearance-none"
                                >
                                    <option value="">Select a Role</option>
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id} style={{ color: r.color ? `#${r.color.toString(16)}` : undefined }}>
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-purple-300 mt-1">Role that can see and manage tickets.</p>
                            </div>

                            {/* Welcome Message */}
                            <div>
                                <label className="block text-purple-200 mb-2">Ticket Welcome Message</label>
                                <textarea
                                    value={welcomeMsg}
                                    onChange={(e) => setWelcomeMsg(e.target.value)}
                                    className="w-full h-24 px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Welcome text inside the ticket..."
                                ></textarea>
                            </div>

                            <button
                                onClick={handleSaveConfig}
                                disabled={saving}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all"
                            >
                                {saving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>

                    {/* Panel Creator Section */}
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            📩 Create Ticket Panel
                        </h2>
                        <p className="text-purple-200 mb-6">Send a message with a "Create Ticket" button to a channel.</p>

                        <div className="grid gap-6">
                            <div>
                                <label className="block text-purple-200 mb-2">Target Channel</label>
                                <select
                                    value={panelChannelId}
                                    onChange={(e) => setPanelChannelId(e.target.value)}
                                    className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white appearance-none"
                                >
                                    <option value="">Select a Channel</option>
                                    {textChannels.map(c => (
                                        <option key={c.id} value={c.id}>#{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-purple-200 mb-2">Embed Title</label>
                                    <input
                                        type="text"
                                        value={panelTitle}
                                        onChange={(e) => setPanelTitle(e.target.value)}
                                        className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-purple-200 mb-2">Embed Description</label>
                                    <input
                                        type="text"
                                        value={panelDesc}
                                        onChange={(e) => setPanelDesc(e.target.value)}
                                        className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSendPanel}
                                disabled={sending}
                                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-emerald-900/20"
                            >
                                {sending ? 'Sending...' : '🚀 Send Ticket Panel'}
                            </button>
                        </div>
                    </div>

                </main>
            </div>
        </div>
    )
}
