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

export default function WelcomerPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const params = useParams()
    const serverId = params.id as string

    const [guildInfo, setGuildInfo] = useState<GuildInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Data
    const [channels, setChannels] = useState<Channel[]>([])

    // State
    const [activeTab, setActiveTab] = useState<'welcome' | 'goodbye'>('welcome')

    // Welcome Config
    const [welcomeEnabled, setWelcomeEnabled] = useState(false)
    const [welcomeChannelId, setWelcomeChannelId] = useState('')
    const [welcomeMessage, setWelcomeMessage] = useState('Welcome {user} to **{server}**!')
    const [welcomeBackgroundUrl, setWelcomeBackgroundUrl] = useState('')

    // Goodbye Config
    const [goodbyeEnabled, setGoodbyeEnabled] = useState(false)
    const [goodbyeChannelId, setGoodbyeChannelId] = useState('')
    const [goodbyeMessage, setGoodbyeMessage] = useState('Goodbye **{user}**! You left **{server}**.')
    const [goodbyeBackgroundUrl, setGoodbyeBackgroundUrl] = useState('')

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
        const res = await fetch(`/api/guilds/${serverId}/welcomer`)
        if (res.ok) {
            const data = await res.json()
            // Welcome
            setWelcomeEnabled(data.welcome_enabled)
            if (data.welcome_channel_id) setWelcomeChannelId(data.welcome_channel_id)
            if (data.welcome_message) setWelcomeMessage(data.welcome_message)
            if (data.welcome_background_url) setWelcomeBackgroundUrl(data.welcome_background_url)

            // Goodbye
            setGoodbyeEnabled(data.goodbye_enabled)
            if (data.goodbye_channel_id) setGoodbyeChannelId(data.goodbye_channel_id)
            if (data.goodbye_message) setGoodbyeMessage(data.goodbye_message)
            if (data.goodbye_background_url) setGoodbyeBackgroundUrl(data.goodbye_background_url)
        }
    }

    const fetchResources = async () => {
        const resCh = await fetch(`/api/guilds/${serverId}/channels`)
        if (resCh.ok) setChannels(await resCh.json())
    }

    const handleSaveConfig = async () => {
        setSaving(true)
        try {
            const res = await fetch(`/api/guilds/${serverId}/welcomer`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    welcome_enabled: welcomeEnabled,
                    welcome_channel_id: welcomeChannelId,
                    welcome_message: welcomeMessage,
                    welcome_background_url: welcomeBackgroundUrl,
                    goodbye_enabled: goodbyeEnabled,
                    goodbye_channel_id: goodbyeChannelId,
                    goodbye_message: goodbyeMessage,
                    goodbye_background_url: goodbyeBackgroundUrl,
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

    // Filter text channels
    const textChannels = channels.filter(c => c.type === 0)

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
                    <h1 className="text-3xl font-bold text-white">Welcomer & Goodbye</h1>
                    <p className="text-purple-200">Customize welcome messages and images</p>
                </header>

                <main className="p-6 max-w-4xl mx-auto space-y-8">

                    {/* Tabs */}
                    <div className="flex space-x-1 bg-white/5 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('welcome')}
                            className={`flex-1 py-2.5 text-sm font-medium leading-5 rounded-lg transition-all ${activeTab === 'welcome'
                                    ? 'bg-indigo-600 text-white shadow'
                                    : 'text-purple-200 hover:bg-white/[0.12] hover:text-white'
                                }`}
                        >
                            👋 Welcome Settings
                        </button>
                        <button
                            onClick={() => setActiveTab('goodbye')}
                            className={`flex-1 py-2.5 text-sm font-medium leading-5 rounded-lg transition-all ${activeTab === 'goodbye'
                                    ? 'bg-pink-600 text-white shadow'
                                    : 'text-purple-200 hover:bg-white/[0.12] hover:text-white'
                                }`}
                        >
                            😢 Goodbye Settings
                        </button>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 transition-all duration-300">
                        {activeTab === 'welcome' ? (
                            <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                        Configure Welcome
                                    </h2>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={welcomeEnabled} onChange={(e) => setWelcomeEnabled(e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        <span className="ml-3 text-sm font-medium text-white">{welcomeEnabled ? 'On' : 'Off'}</span>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-purple-200 mb-2">Welcome Channel</label>
                                    <select
                                        value={welcomeChannelId}
                                        onChange={(e) => setWelcomeChannelId(e.target.value)}
                                        className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white appearance-none"
                                    >
                                        <option value="">Select a Channel</option>
                                        {textChannels.map(c => (
                                            <option key={c.id} value={c.id}>#{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-purple-200 mb-2">Welcome Message</label>
                                    <textarea
                                        value={welcomeMessage}
                                        onChange={(e) => setWelcomeMessage(e.target.value)}
                                        className="w-full h-24 px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Welcome {user} to {server}!"
                                    ></textarea>
                                    <p className="text-xs text-purple-300 mt-1">Variables: `{"{user}"}`, `{"{server}"}`, `{"{memberCount}"}`.</p>
                                </div>

                                <div>
                                    <label className="block text-purple-200 mb-2">Background Image URL</label>
                                    <input
                                        type="text"
                                        value={welcomeBackgroundUrl}
                                        onChange={(e) => setWelcomeBackgroundUrl(e.target.value)}
                                        className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white"
                                        placeholder="https://example.com/image.png"
                                    />
                                    {welcomeBackgroundUrl && (
                                        <div className="mt-4">
                                            <p className="text-purple-200 mb-2">Preview:</p>
                                            <img src={welcomeBackgroundUrl} alt="Preview" className="max-w-full h-auto rounded-lg border border-white/10" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                        Configure Goodbye
                                    </h2>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={goodbyeEnabled} onChange={(e) => setGoodbyeEnabled(e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                                        <span className="ml-3 text-sm font-medium text-white">{goodbyeEnabled ? 'On' : 'Off'}</span>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-purple-200 mb-2">Goodbye Channel</label>
                                    <select
                                        value={goodbyeChannelId}
                                        onChange={(e) => setGoodbyeChannelId(e.target.value)}
                                        className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white appearance-none"
                                    >
                                        <option value="">Select a Channel</option>
                                        {textChannels.map(c => (
                                            <option key={c.id} value={c.id}>#{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-purple-200 mb-2">Goodbye Message</label>
                                    <textarea
                                        value={goodbyeMessage}
                                        onChange={(e) => setGoodbyeMessage(e.target.value)}
                                        className="w-full h-24 px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        placeholder="Goodbye {user}! You left {server}."
                                    ></textarea>
                                    <p className="text-xs text-purple-300 mt-1">Variables: `{"{user}"}`, `{"{server}"}`.</p>
                                </div>

                                <div>
                                    <label className="block text-purple-200 mb-2">Background Image URL</label>
                                    <input
                                        type="text"
                                        value={goodbyeBackgroundUrl}
                                        onChange={(e) => setGoodbyeBackgroundUrl(e.target.value)}
                                        className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white"
                                        placeholder="https://example.com/image.png"
                                    />
                                    {goodbyeBackgroundUrl && (
                                        <div className="mt-4">
                                            <p className="text-purple-200 mb-2">Preview:</p>
                                            <img src={goodbyeBackgroundUrl} alt="Preview" className="max-w-full h-auto rounded-lg border border-white/10" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-white/10">
                            <button
                                onClick={handleSaveConfig}
                                disabled={saving}
                                className={`w-full py-3 font-bold rounded-lg transition-all text-white ${saving ? 'bg-gray-600' : 'bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700'
                                    }`}
                            >
                                {saving ? 'Saving...' : 'Save All Changes'}
                            </button>
                        </div>
                    </div>

                </main>
            </div>
        </div>
    )
}
