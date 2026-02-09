'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { toast } from 'react-hot-toast'

interface Warning {
    id: number
    user_id: string
    moderator_id: string
    reason: string
    timestamp: number
}

interface GuildInfo {
    id: string
    name: string
    icon: string | null
}

export default function WarningsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const params = useParams()
    const serverId = params.id as string

    const [guildInfo, setGuildInfo] = useState<GuildInfo | null>(null)
    const [warnings, setWarnings] = useState<Warning[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/')
        } else if (status === 'authenticated') {
            fetchGuildInfo()
            fetchWarnings()
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

    const fetchWarnings = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/guilds/${serverId}/warnings?limit=100`)
            if (res.ok) {
                const data = await res.json()
                setWarnings(data)
            }
        } catch (error) {
            console.error('Error fetching warnings:', error)
            toast.error('Failed to load warnings')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (warningId: number) => {
        if (!confirm('Are you sure you want to delete this warning?')) return

        try {
            const res = await fetch(`/api/guilds/${serverId}/warnings/${warningId}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                toast.success('Warning deleted')
                setWarnings(warnings.filter(w => w.id !== warningId))
            } else {
                toast.error('Failed to delete warning')
            }
        } catch (error) {
            console.error('Error deleting warning:', error)
            toast.error('Error deleting warning')
        }
    }

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString()
    }

    if (loading && warnings.length === 0) {
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
                    <h1 className="text-3xl font-bold text-white">Warnings</h1>
                    <p className="text-purple-200">Manage user warnings</p>
                </header>

                <main className="p-6">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="p-4 text-purple-200 font-semibold">User ID</th>
                                        <th className="p-4 text-purple-200 font-semibold">Moderator ID</th>
                                        <th className="p-4 text-purple-200 font-semibold">Reason</th>
                                        <th className="p-4 text-purple-200 font-semibold">Date</th>
                                        <th className="p-4 text-purple-200 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {warnings.length > 0 ? (
                                        warnings.map((warning) => (
                                            <tr key={warning.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 text-white font-mono text-sm">
                                                    {warning.user_id}
                                                </td>
                                                <td className="p-4 text-white font-mono text-sm">
                                                    {warning.moderator_id}
                                                </td>
                                                <td className="p-4 text-white max-w-xs truncate" title={warning.reason}>
                                                    {warning.reason || 'No reason provided'}
                                                </td>
                                                <td className="p-4 text-white text-sm">
                                                    {formatDate(warning.timestamp)}
                                                </td>
                                                <td className="p-4">
                                                    <button
                                                        onClick={() => handleDelete(warning.id)}
                                                        className="px-3 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm transition-colors border border-red-500/20"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-white/50">
                                                No warnings found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
