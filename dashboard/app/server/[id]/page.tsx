'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

interface GuildConfig {
    guild_id: string
    mod_log_channel: string | null
    auto_mod_enabled: number
    raid_protection_enabled: number
    max_warnings: number
    auto_action: string
}

interface GuildInfo {
    id: string
    name: string
    icon: string | null
}

export default function ServerPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const params = useParams()
    const serverId = params.id as string

    const [config, setConfig] = useState<GuildConfig | null>(null)
    const [guildInfo, setGuildInfo] = useState<GuildInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Form state
    const [modLogChannel, setModLogChannel] = useState('')
    const [raidProtectionEnabled, setRaidProtectionEnabled] = useState(false)
    const [maxWarnings, setMaxWarnings] = useState(3)
    const [autoAction, setAutoAction] = useState('timeout')

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/')
        } else if (status === 'authenticated') {
            fetchConfig()
            fetchGuildInfo()
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

    const fetchConfig = async () => {
        try {
            const res = await fetch(`/api/guilds/${serverId}`)
            if (res.ok) {
                const data = await res.json()
                setConfig(data)
                if (data) {
                    setModLogChannel(data.mod_log_channel || '')
                    setRaidProtectionEnabled(!!data.raid_protection_enabled)
                    setMaxWarnings(data.max_warnings || 3)
                    setAutoAction(data.auto_action || 'timeout')
                }
            }
        } catch (error) {
            console.error('Error fetching config:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch(`/api/guilds/${serverId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mod_log_channel: modLogChannel || null,
                    raid_protection_enabled: raidProtectionEnabled ? 1 : 0,
                    max_warnings: maxWarnings,
                    auto_action: autoAction,
                }),
            })

            if (res.ok) {
                alert('Configuration saved successfully!')
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
            {/* Sidebar */}
            <Sidebar
                serverId={serverId}
                serverName={guildInfo?.name}
                serverIcon={guildInfo?.icon}
            />

            {/* Main Content with sidebar offset */}
            <div className="lg:pl-64">
                {/* Main Content */}
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h1 className="text-4xl font-bold text-white mb-8 mt-12 lg:mt-0">Server Configuration</h1>

                    <div className="grid gap-6">
                        {/* Moderation Settings */}
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                🛡️ Moderation Settings
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-purple-200 mb-2">
                                        Mod Log Channel ID
                                    </label>
                                    <input
                                        type="text"
                                        value={modLogChannel}
                                        onChange={(e) => setModLogChannel(e.target.value)}
                                        placeholder="Enter channel ID"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <p className="text-sm text-purple-300 mt-1">
                                        Channel where moderation actions will be logged
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Anti-Raid Protection */}
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                🔒 Anti-Raid Protection
                            </h2>

                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                                <input
                                    type="checkbox"
                                    id="raid"
                                    checked={raidProtectionEnabled}
                                    onChange={(e) => setRaidProtectionEnabled(e.target.checked)}
                                    className="w-5 h-5 rounded bg-white/5 border-white/20"
                                />
                                <label htmlFor="raid" className="text-white flex-1">
                                    <span className="font-semibold">Enable Raid Protection</span>
                                    <p className="text-sm text-purple-300">Protect against mass joins and raids</p>
                                </label>
                            </div>
                        </div>

                        {/* Warning System */}
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                ⚠️ Warning System
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-purple-200 mb-2">
                                        Maximum Warnings
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={maxWarnings}
                                        onChange={(e) => setMaxWarnings(parseInt(e.target.value) || 3)}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <p className="text-sm text-purple-300 mt-1">
                                        Number of warnings before automatic action (1-10)
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-purple-200 mb-2">
                                        Auto Action
                                    </label>
                                    <select
                                        value={autoAction}
                                        onChange={(e) => setAutoAction(e.target.value)}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="timeout">Timeout (Mute)</option>
                                        <option value="kick">Kick</option>
                                        <option value="ban">Ban</option>
                                    </select>
                                    <p className="text-sm text-purple-300 mt-1">
                                        Action to take when user reaches max warnings
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-lg rounded-lg transition-all shadow-xl hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : '💾 Save Configuration'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
