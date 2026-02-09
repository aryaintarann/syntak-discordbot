'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'

interface Stats {
    memberCount: number
    onlineCount: number
    warningCount: number
    logCount: number
}

interface GuildInfo {
    id: string
    name: string
    icon: string | null
}

export default function StatsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const params = useParams()
    const serverId = params.id as string

    const [guildInfo, setGuildInfo] = useState<GuildInfo | null>(null)
    const [stats, setStats] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/')
        } else if (status === 'authenticated') {
            fetchGuildInfo()
            fetchStats()
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

    const fetchStats = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/guilds/${serverId}/stats`)
            if (res.ok) {
                const data = await res.json()
                setStats(data)
            }
        } catch (error) {
            console.error('Error fetching stats:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading && !stats) {
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
                    <h1 className="text-3xl font-bold text-white">Statistics</h1>
                    <p className="text-purple-200">Server Overview & Analytics</p>
                </header>

                <main className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Member Count */}
                        <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 backdrop-blur-md border border-indigo-500/20 rounded-xl p-6">
                            <h3 className="text-purple-200 font-semibold mb-2">Total Members</h3>
                            <div className="text-4xl font-bold text-white">{stats?.memberCount || 0}</div>
                        </div>

                        {/* Online Count */}
                        <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-md border border-green-500/20 rounded-xl p-6">
                            <h3 className="text-green-200 font-semibold mb-2">Online Members</h3>
                            <div className="text-4xl font-bold text-white">{stats?.onlineCount || 0}</div>
                        </div>

                        {/* Warnings Count */}
                        <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 backdrop-blur-md border border-orange-500/20 rounded-xl p-6">
                            <h3 className="text-orange-200 font-semibold mb-2">Active Warnings</h3>
                            <div className="text-4xl font-bold text-white">{stats?.warningCount || 0}</div>
                        </div>

                        {/* Mod Logs Count */}
                        <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 backdrop-blur-md border border-blue-500/20 rounded-xl p-6">
                            <h3 className="text-blue-200 font-semibold mb-2">Mod Actions Logged</h3>
                            <div className="text-4xl font-bold text-white">{stats?.logCount || 0}</div>
                        </div>
                    </div>

                    <div className="mt-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-8 text-center">
                        <h2 className="text-2xl font-bold text-white mb-4">More charts coming soon!</h2>
                        <p className="text-purple-200">
                            Detailed analytics for message activity, voice time, and clearer moderation trends are in development.
                        </p>
                    </div>
                </main>
            </div>
        </div>
    )
}
