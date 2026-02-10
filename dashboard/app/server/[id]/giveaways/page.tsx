'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { toast } from 'react-hot-toast'
import { GiftIcon } from '@heroicons/react/24/outline'

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

interface Giveaway {
    id: number
    prize: string
    end_time: number
    winners_count: number
    ended: number
}

export default function GiveawaysPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const params = useParams()
    const serverId = params.id as string

    const [guildInfo, setGuildInfo] = useState<GuildInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Data
    const [channels, setChannels] = useState<Channel[]>([])
    const [activeGiveaways, setActiveGiveaways] = useState<Giveaway[]>([])
    const [historyGiveaways, setHistoryGiveaways] = useState<Giveaway[]>([])

    // Form
    const [channelId, setChannelId] = useState('')
    const [prize, setPrize] = useState('')
    const [winnersCount, setWinnersCount] = useState(1)

    // Duration Inputs
    const [durationDays, setDurationDays] = useState(0)
    const [durationHours, setDurationHours] = useState(0)
    const [durationMinutes, setDurationMinutes] = useState(0)

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
                fetchResources(),
                fetchGiveaways()
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
        const resCh = await fetch(`/api/guilds/${serverId}/channels`)
        if (resCh.ok) setChannels(await resCh.json())
    }

    const fetchGiveaways = async () => {
        const [resActive, resHistory] = await Promise.all([
            fetch(`/api/guilds/${serverId}/giveaways?view=active`),
            fetch(`/api/guilds/${serverId}/giveaways?view=history`)
        ])

        if (resActive.ok) setActiveGiveaways(await resActive.json())
        if (resHistory.ok) setHistoryGiveaways(await resHistory.json())
    }

    const handleCreate = async () => {
        if (!channelId || !prize) {
            toast.error('Please fill all fields')
            return
        }

        const totalMinutes = (durationDays * 24 * 60) + (durationHours * 60) + durationMinutes

        if (totalMinutes < 1) {
            toast.error('Duration must be at least 1 minute')
            return
        }

        setSaving(true)
        try {
            const res = await fetch(`/api/guilds/${serverId}/giveaways`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel_id: channelId,
                    prize,
                    winners_count: winnersCount,
                    duration_minutes: totalMinutes
                })
            })

            if (res.ok) {
                toast.success('Giveaway started!')
                setPrize('')
                setDurationDays(0)
                setDurationHours(0)
                setDurationMinutes(0)
                fetchGiveaways()
            } else {
                const err = await res.json()
                toast.error(err.error || 'Failed to start')
            }
        } catch (e) {
            toast.error('Error starting giveaway')
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
                    <h1 className="text-3xl font-bold text-white">Giveaways</h1>
                    <p className="text-purple-200">Start and manage giveaways.</p>
                </header>

                <main className="p-6 max-w-4xl mx-auto space-y-8">

                    {/* Create Form */}
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            🎁 Start Giveaway
                        </h2>

                        <div className="grid gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-purple-200 mb-2">Channel</label>
                                    <select
                                        value={channelId}
                                        onChange={(e) => setChannelId(e.target.value)}
                                        className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white appearance-none"
                                    >
                                        <option value="">Select Channel</option>
                                        {textChannels.map(c => (
                                            <option key={c.id} value={c.id}>#{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-purple-200 mb-2">Prize</label>
                                    <input
                                        type="text" value={prize} onChange={(e) => setPrize(e.target.value)}
                                        className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white"
                                        placeholder="e.g. Nitro Basic"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-purple-200 mb-2">Duration</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <input
                                                type="number" value={durationDays} onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
                                                className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white"
                                                min="0" placeholder="Days"
                                            />
                                            <span className="text-xs text-purple-300 block mt-1">Days</span>
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="number" value={durationHours} onChange={(e) => setDurationHours(parseInt(e.target.value) || 0)}
                                                className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white"
                                                min="0" max="23" placeholder="Hours"
                                            />
                                            <span className="text-xs text-purple-300 block mt-1">Hours</span>
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                                                className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white"
                                                min="0" max="59" placeholder="Mins"
                                            />
                                            <span className="text-xs text-purple-300 block mt-1">Mins</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-purple-200 mb-2">Winners Count</label>
                                    <input
                                        type="number" value={winnersCount} onChange={(e) => setWinnersCount(parseInt(e.target.value))}
                                        className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white"
                                        min="1"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleCreate}
                                disabled={saving}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all"
                            >
                                {saving ? 'Starting...' : '🚀 Start Giveaway'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Active Giveaways */}
                        <div>
                            <h2 className="text-xl font-bold text-white mb-4">Active Giveaways</h2>
                            <div className="space-y-4">
                                {activeGiveaways.length === 0 ? (
                                    <p className="text-gray-400 italic">No active giveaways.</p>
                                ) : (
                                    activeGiveaways.map(g => (
                                        <div key={g.id} className="bg-black/20 border border-white/10 p-4 rounded-lg flex justify-between items-center">
                                            <div>
                                                <h3 className="font-bold text-white text-lg">{g.prize}</h3>
                                                <p className="text-sm text-purple-300">Ends: {new Date(g.end_time).toLocaleString()}</p>
                                                <p className="text-xs text-gray-400">Winners: {g.winners_count}</p>
                                            </div>
                                            <div className="text-emerald-400 font-bold px-3 py-1 bg-emerald-900/20 rounded text-xs">
                                                ACTIVE
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* History */}
                        <div>
                            <h2 className="text-xl font-bold text-white mb-4">Giveaway History</h2>
                            <div className="space-y-4 h-96 overflow-y-auto pr-2 custom-scrollbar">
                                {historyGiveaways.length === 0 ? (
                                    <p className="text-gray-400 italic">No history yet.</p>
                                ) : (
                                    historyGiveaways.map(g => (
                                        <div key={g.id} className="bg-white/5 border border-white/5 p-4 rounded-lg flex justify-between items-center opacity-75 hover:opacity-100 transition-opacity">
                                            <div>
                                                <h3 className="font-bold text-gray-300 text-base">{g.prize}</h3>
                                                <p className="text-xs text-gray-500">Ended: {new Date(g.end_time).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-gray-400 font-bold px-2 py-1 bg-gray-800 rounded text-xs">
                                                ENDED
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                </main>
            </div>
        </div>
    )
}
