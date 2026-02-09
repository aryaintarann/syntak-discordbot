'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'

interface ModLog {
    id: number
    action_type: string
    target_id: string
    target_tag: string
    moderator_id: string
    moderator_tag: string
    reason: string
    timestamp: number
    additional_data?: any
}

interface GuildInfo {
    id: string
    name: string
    icon: string | null
}

export default function ModLogsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const params = useParams()
    const serverId = params.id as string

    const [guildInfo, setGuildInfo] = useState<GuildInfo | null>(null)
    const [logs, setLogs] = useState<ModLog[]>([])
    const [loading, setLoading] = useState(true)
    const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0, hasMore: false })

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/')
        } else if (status === 'authenticated') {
            fetchGuildInfo()
            fetchLogs()
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

    const fetchLogs = async (offset = 0) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/guilds/${serverId}/modlogs?limit=50&offset=${offset}`)
            if (res.ok) {
                const data = await res.json()
                setLogs(data.logs)
                setPagination(data.pagination)
            }
        } catch (error) {
            console.error('Error fetching logs:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString()
    }

    const getActionColor = (action: string) => {
        switch (action.toLowerCase()) {
            case 'ban': return 'text-red-400'
            case 'kick': return 'text-orange-400'
            case 'mute':
            case 'timeout': return 'text-yellow-400'
            case 'warn': return 'text-yellow-200'
            case 'unban': return 'text-green-400'
            case 'unmute': return 'text-green-400'
            default: return 'text-white'
        }
    }

    if (loading && logs.length === 0) {
        return (
            <div className="flex h-screen bg-[#0f0e17]">
                <Sidebar serverId={serverId} serverName={guildInfo?.name} serverIcon={guildInfo?.icon} />
                <div className="flex-1 flex items-center justify-center">
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
                    <h1 className="text-3xl font-bold text-white">Mod Logs</h1>
                    <p className="text-purple-200">View recent moderation actions</p>
                </header>

                <main className="p-6">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="p-4 text-purple-200 font-semibold">Action</th>
                                        <th className="p-4 text-purple-200 font-semibold">User</th>
                                        <th className="p-4 text-purple-200 font-semibold">Moderator</th>
                                        <th className="p-4 text-purple-200 font-semibold">Reason</th>
                                        <th className="p-4 text-purple-200 font-semibold">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {logs.length > 0 ? (
                                        logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <span className={`font-bold ${getActionColor(log.action_type)}`}>
                                                        {log.action_type.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-white">
                                                    <div className="font-semibold">{log.target_tag}</div>
                                                    <div className="text-xs text-white/50">{log.target_id}</div>
                                                </td>
                                                <td className="p-4 text-white">
                                                    <div className="font-semibold">{log.moderator_tag}</div>
                                                    <div className="text-xs text-white/50">{log.moderator_id}</div>
                                                </td>
                                                <td className="p-4 text-white max-w-xs truncate" title={log.reason}>
                                                    {log.reason || 'No reason provided'}
                                                </td>
                                                <td className="p-4 text-white text-sm">
                                                    {formatDate(log.timestamp)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-white/50">
                                                No logs found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        <div className="p-4 border-t border-white/10 flex justify-between items-center text-white text-sm">
                            <div>
                                Showing {logs.length > 0 ? pagination.offset + 1 : 0} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} entries
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fetchLogs(pagination.offset - pagination.limit)}
                                    disabled={pagination.offset === 0}
                                    className="px-3 py-1 bg-white/10 rounded disabled:opacity-50 hover:bg-white/20"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => fetchLogs(pagination.offset + pagination.limit)}
                                    disabled={!pagination.hasMore}
                                    className="px-3 py-1 bg-white/10 rounded disabled:opacity-50 hover:bg-white/20"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
