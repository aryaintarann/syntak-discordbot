'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { toast } from 'react-hot-toast'

interface Member {
    id: string
    username: string
    avatar: string
    joinedAt: string
    roles: string[]
}

interface GuildInfo {
    id: string
    name: string
    icon: string | null
}

export default function UsersPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const params = useParams()
    const serverId = params.id as string

    const [guildInfo, setGuildInfo] = useState<GuildInfo | null>(null)
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/')
        } else if (status === 'authenticated') {
            fetchGuildInfo()
            fetchMembers()
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

    const fetchMembers = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/guilds/${serverId}/users`)
            if (res.ok) {
                const data = await res.json()
                setMembers(data)
            } else {
                toast.error('Failed to fetch members')
            }
        } catch (error) {
            console.error('Error fetching members:', error)
            toast.error('Error loading members')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString()
    }

    if (loading && members.length === 0) {
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
                    <h1 className="text-3xl font-bold text-white">Users</h1>
                    <p className="text-purple-200">Recent members in the server</p>
                </header>

                <main className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {members.map((member) => (
                            <div key={member.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 flex flex-col items-center hover:bg-white/10 transition-all">
                                <img
                                    src={member.avatar}
                                    alt={member.username}
                                    className="w-20 h-20 rounded-full mb-4 border-2 border-indigo-500"
                                />
                                <h3 className="text-xl font-bold text-white mb-1 text-center">{member.username}</h3>
                                <p className="text-purple-300 text-sm mb-4 text-center">ID: {member.id}</p>

                                <div className="w-full pt-4 border-t border-white/10 flex justify-between items-center text-sm">
                                    <span className="text-white/50">Joined</span>
                                    <span className="text-white">{formatDate(member.joinedAt)}</span>
                                </div>
                            </div>
                        ))}

                        {members.length === 0 && !loading && (
                            <div className="col-span-full text-center py-12 text-white/50">
                                No members found.
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    )
}
