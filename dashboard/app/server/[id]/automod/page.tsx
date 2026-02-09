'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

interface GuildInfo {
    id: string
    name: string
    icon: string | null
}

interface Channel {
    id: string
    name: string
    type: number
    position: number
}

interface AutomodConfig {
    enabled: boolean
    badWords: string[]
    spam: {
        messageThreshold: number
        timeWindow: number
    }
    filters: {
        linkSpam: {
            enabled: boolean
            exemptChannels: string[]
        }
        massMention: {
            enabled: boolean
            exemptChannels: string[]
        }
        inviteLinks: {
            enabled: boolean
            exemptChannels: string[]
        }
        caps: {
            enabled: boolean
            exemptChannels: string[]
        }
    }
}

export default function AutomodPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const params = useParams()
    const serverId = params.id as string

    const [guildInfo, setGuildInfo] = useState<GuildInfo | null>(null)
    const [channels, setChannels] = useState<Channel[]>([])
    const [config, setConfig] = useState<AutomodConfig | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Form state
    const [enabled, setEnabled] = useState(true)
    const [badWords, setBadWords] = useState<string[]>([])
    const [newWord, setNewWord] = useState('')
    const [messageThreshold, setMessageThreshold] = useState(5)
    const [timeWindow, setTimeWindow] = useState(5)
    const [linkSpamEnabled, setLinkSpamEnabled] = useState(true)
    const [linkSpamExemptChannels, setLinkSpamExemptChannels] = useState<string[]>([])
    const [massMentionEnabled, setMassMentionEnabled] = useState(true)
    const [massMentionExemptChannels, setMassMentionExemptChannels] = useState<string[]>([])
    const [inviteLinksEnabled, setInviteLinksEnabled] = useState(true)
    const [inviteLinksExemptChannels, setInviteLinksExemptChannels] = useState<string[]>([])
    const [capsEnabled, setCapsEnabled] = useState(false)
    const [capsExemptChannels, setCapsExemptChannels] = useState<string[]>([])

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/')
        } else if (status === 'authenticated') {
            fetchGuildInfo()
            fetchChannels()
            fetchConfig()
        }
    }, [status, router, serverId])

    const fetchGuildInfo = async () => {
        try {
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
        } catch (error) {
            console.error('Error fetching guild info:', error)
        }
    }

    const fetchChannels = async () => {
        try {
            const res = await fetch(`/api/guilds/${serverId}/channels`)

            if (res.ok) {
                const data = await res.json()
                setChannels(data)
            }
        } catch (error) {
            console.error('Error fetching channels:', error)
        }
    }

    const fetchConfig = async () => {
        try {
            const res = await fetch(`/api/guilds/${serverId}/automod`)
            if (res.ok) {
                const data = await res.json()
                setConfig(data)
                setEnabled(data.enabled ?? true)
                setBadWords(data.badWords || [])
                setMessageThreshold(data.spam?.messageThreshold || 5)
                setTimeWindow(data.spam?.timeWindow || 5)
                setLinkSpamEnabled(data.filters?.linkSpam?.enabled ?? true)
                setLinkSpamExemptChannels(data.filters?.linkSpam?.exemptChannels || [])
                setMassMentionEnabled(data.filters?.massMention?.enabled ?? true)
                setMassMentionExemptChannels(data.filters?.massMention?.exemptChannels || [])
                setInviteLinksEnabled(data.filters?.inviteLinks?.enabled ?? true)
                setInviteLinksExemptChannels(data.filters?.inviteLinks?.exemptChannels || [])
                setCapsEnabled(data.filters?.caps?.enabled ?? false)
                setCapsExemptChannels(data.filters?.caps?.exemptChannels || [])
            }
        } catch (error) {
            console.error('Error fetching config:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddWord = () => {
        const word = newWord.trim().toLowerCase()
        if (word && !badWords.includes(word)) {
            setBadWords([...badWords, word])
            setNewWord('')
        }
    }

    const handleRemoveWord = (word: string) => {
        setBadWords(badWords.filter(w => w !== word))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch(`/api/guilds/${serverId}/automod`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    enabled,
                    badWords,
                    spam: {
                        messageThreshold,
                        timeWindow
                    },
                    filters: {
                        linkSpam: {
                            enabled: linkSpamEnabled,
                            exemptChannels: linkSpamExemptChannels
                        },
                        massMention: {
                            enabled: massMentionEnabled,
                            exemptChannels: massMentionExemptChannels
                        },
                        inviteLinks: {
                            enabled: inviteLinksEnabled,
                            exemptChannels: inviteLinksExemptChannels
                        },
                        caps: {
                            enabled: capsEnabled,
                            exemptChannels: capsExemptChannels
                        }
                    }
                }),
            })

            if (res.ok) {
                alert('Automod configuration saved successfully!')
                fetchConfig()
            } else {
                const error = await res.json()
                alert(`Failed to save: ${error.error || 'Unknown error'}`)
            }
        } catch (error) {
            console.error('Error saving config:', error)
            alert('Failed to save configuration')
        } finally {
            setSaving(false)
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
                <div className="text-white text-2xl">Loading...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
            <Sidebar
                serverId={serverId}
                serverName={guildInfo?.name}
                serverIcon={guildInfo?.icon}
            />

            <div className="lg:pl-64">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h1 className="text-4xl font-bold text-white mb-8 mt-12 lg:mt-0">Auto-Moderation Configuration</h1>

                    <div className="grid gap-6">
                        {/* Master Toggle */}
                        <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 backdrop-blur-md border-2 border-indigo-500/50 rounded-xl p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-3xl">
                                    🤖
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-white mb-1">Auto-Moderation System</h2>
                                    <p className="text-purple-200">Master control for all automated moderation features</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={enabled}
                                        onChange={(e) => setEnabled(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-16 h-8 bg-red-600/50 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/50 rounded-full peer peer-checked:after:translate-x-8 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-green-600"></div>
                                    <span className="ml-3 text-lg font-semibold text-white">
                                        {enabled ? 'ENABLED' : 'DISABLED'}
                                    </span>
                                </label>
                            </div>
                            {!enabled && (
                                <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                                    <p className="text-yellow-200 text-sm">⚠️ Auto-moderation is currently disabled. No automatic actions will be taken.</p>
                                </div>
                            )}
                        </div>

                        {/* Bad Words Filter */}
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                🚫 Bad Words Filter
                            </h2>

                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newWord}
                                        onChange={(e) => setNewWord(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddWord()}
                                        placeholder="Add a word to filter..."
                                        className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button
                                        onClick={handleAddWord}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-semibold transition-all"
                                    >
                                        Add
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2 min-h-[100px] p-4 bg-white/5 rounded-lg">
                                    {badWords.length === 0 ? (
                                        <p className="text-purple-300 text-sm">No words added yet. Add words to filter from messages.</p>
                                    ) : (
                                        badWords.map((word) => (
                                            <span
                                                key={word}
                                                className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200"
                                            >
                                                {word}
                                                <button
                                                    onClick={() => handleRemoveWord(word)}
                                                    className="hover:text-white transition-colors"
                                                >
                                                    ✕
                                                </button>
                                            </span>
                                        ))
                                    )}
                                </div>
                                <p className="text-sm text-purple-300">
                                    Messages containing these words will be automatically deleted
                                </p>
                            </div>
                        </div>

                        {/* Spam Detection */}
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                ⚡ Spam Detection
                            </h2>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-purple-200 mb-2">
                                        Message Threshold
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={messageThreshold}
                                        onChange={(e) => setMessageThreshold(parseInt(e.target.value) || 5)}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <p className="text-sm text-purple-300 mt-1">
                                        Max messages allowed within time window (1-20)
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-purple-200 mb-2">
                                        Time Window (seconds)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={timeWindow}
                                        onChange={(e) => setTimeWindow(parseInt(e.target.value) || 5)}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <p className="text-sm text-purple-300 mt-1">
                                        Time window to track messages (1-60 seconds)
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Content Filters with Per-Filter Channel Selection */}
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                🛡️ Content Filters
                            </h2>
                            <p className="text-purple-200 mb-6">
                                Configure each filter and select channels where it will NOT apply
                            </p>

                            <div className="space-y-6">
                                {/* Link Spam Protection */}
                                <div className="border border-white/10 rounded-lg p-4 bg-white/5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <input
                                            type="checkbox"
                                            id="linkSpam"
                                            checked={linkSpamEnabled}
                                            onChange={(e) => setLinkSpamEnabled(e.target.checked)}
                                            className="w-5 h-5 rounded bg-white/5 border-white/20"
                                        />
                                        <label htmlFor="linkSpam" className="text-white flex-1">
                                            <span className="font-semibold text-lg">🔗 Link Spam Protection</span>
                                            <p className="text-sm text-purple-300">Block messages with too many links</p>
                                        </label>
                                    </div>

                                    {linkSpamEnabled && (
                                        <div className="mt-4 pl-8">
                                            <label className="block text-purple-200 mb-2 text-sm">Exempt Channels:</label>
                                            <select
                                                multiple
                                                value={linkSpamExemptChannels}
                                                onChange={(e) => setLinkSpamExemptChannels(Array.from(e.target.selectedOptions, option => option.value))}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                                            >
                                                {channels.map((channel) => (
                                                    <option key={channel.id} value={channel.id} className="py-1">
                                                        # {channel.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {linkSpamExemptChannels.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {linkSpamExemptChannels.map((channelId: string) => {
                                                        const channel = channels.find(c => c.id === channelId)
                                                        return channel ? (
                                                            <span
                                                                key={channelId}
                                                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-blue-200 text-xs"
                                                            >
                                                                # {channel.name}
                                                                <button
                                                                    onClick={() => setLinkSpamExemptChannels(linkSpamExemptChannels.filter((id: string) => id !== channelId))}
                                                                    className="hover:text-white transition-colors"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </span>
                                                        ) : null
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Mass Mention Protection */}
                                <div className="border border-white/10 rounded-lg p-4 bg-white/5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <input
                                            type="checkbox"
                                            id="massMention"
                                            checked={massMentionEnabled}
                                            onChange={(e) => setMassMentionEnabled(e.target.checked)}
                                            className="w-5 h-5 rounded bg-white/5 border-white/20"
                                        />
                                        <label htmlFor="massMention" className="text-white flex-1">
                                            <span className="font-semibold text-lg">@️ Mass Mention Protection</span>
                                            <p className="text-sm text-purple-300">Block messages with excessive @mentions</p>
                                        </label>
                                    </div>

                                    {massMentionEnabled && (
                                        <div className="mt-4 pl-8">
                                            <label className="block text-purple-200 mb-2 text-sm">Exempt Channels:</label>
                                            <select
                                                multiple
                                                value={massMentionExemptChannels}
                                                onChange={(e) => setMassMentionExemptChannels(Array.from(e.target.selectedOptions, option => option.value))}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                                            >
                                                {channels.map((channel) => (
                                                    <option key={channel.id} value={channel.id} className="py-1">
                                                        # {channel.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {massMentionExemptChannels.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {massMentionExemptChannels.map((channelId: string) => {
                                                        const channel = channels.find(c => c.id === channelId)
                                                        return channel ? (
                                                            <span
                                                                key={channelId}
                                                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-blue-200 text-xs"
                                                            >
                                                                # {channel.name}
                                                                <button
                                                                    onClick={() => setMassMentionExemptChannels(massMentionExemptChannels.filter((id: string) => id !== channelId))}
                                                                    className="hover:text-white transition-colors"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </span>
                                                        ) : null
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Block Invite Links */}
                                <div className="border border-white/10 rounded-lg p-4 bg-white/5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <input
                                            type="checkbox"
                                            id="inviteLinks"
                                            checked={inviteLinksEnabled}
                                            onChange={(e) => setInviteLinksEnabled(e.target.checked)}
                                            className="w-5 h-5 rounded bg-white/5 border-white/20"
                                        />
                                        <label htmlFor="inviteLinks" className="text-white flex-1">
                                            <span className="font-semibold text-lg">🚫 Block Invite Links</span>
                                            <p className="text-sm text-purple-300">Block Discord invite links from other servers</p>
                                        </label>
                                    </div>

                                    {inviteLinksEnabled && (
                                        <div className="mt-4 pl-8">
                                            <label className="block text-purple-200 mb-2 text-sm">Exempt Channels:</label>
                                            <select
                                                multiple
                                                value={inviteLinksExemptChannels}
                                                onChange={(e) => setInviteLinksExemptChannels(Array.from(e.target.selectedOptions, option => option.value))}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                                            >
                                                {channels.map((channel) => (
                                                    <option key={channel.id} value={channel.id} className="py-1">
                                                        # {channel.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {inviteLinksExemptChannels.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {inviteLinksExemptChannels.map((channelId: string) => {
                                                        const channel = channels.find(c => c.id === channelId)
                                                        return channel ? (
                                                            <span
                                                                key={channelId}
                                                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-blue-200 text-xs"
                                                            >
                                                                # {channel.name}
                                                                <button
                                                                    onClick={() => setInviteLinksExemptChannels(inviteLinksExemptChannels.filter((id: string) => id !== channelId))}
                                                                    className="hover:text-white transition-colors"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </span>
                                                        ) : null
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Caps Lock Filter */}
                                <div className="border border-white/10 rounded-lg p-4 bg-white/5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <input
                                            type="checkbox"
                                            id="caps"
                                            checked={capsEnabled}
                                            onChange={(e) => setCapsEnabled(e.target.checked)}
                                            className="w-5 h-5 rounded bg-white/5 border-white/20"
                                        />
                                        <label htmlFor="caps" className="text-white flex-1">
                                            <span className="font-semibold text-lg">🔠 Caps Lock Filter</span>
                                            <p className="text-sm text-purple-300">Block messages with excessive CAPS</p>
                                        </label>
                                    </div>

                                    {capsEnabled && (
                                        <div className="mt-4 pl-8">
                                            <label className="block text-purple-200 mb-2 text-sm">Exempt Channels:</label>
                                            <select
                                                multiple
                                                value={capsExemptChannels}
                                                onChange={(e) => setCapsExemptChannels(Array.from(e.target.selectedOptions, option => option.value))}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                                            >
                                                {channels.map((channel) => (
                                                    <option key={channel.id} value={channel.id} className="py-1">
                                                        # {channel.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {capsExemptChannels.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {capsExemptChannels.map((channelId: string) => {
                                                        const channel = channels.find(c => c.id === channelId)
                                                        return channel ? (
                                                            <span
                                                                key={channelId}
                                                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-blue-200 text-xs"
                                                            >
                                                                # {channel.name}
                                                                <button
                                                                    onClick={() => setCapsExemptChannels(capsExemptChannels.filter((id: string) => id !== channelId))}
                                                                    className="hover:text-white transition-colors"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </span>
                                                        ) : null
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-lg rounded-lg transition-all shadow-xl hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : '💾 Save Auto-Moderation Settings'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
