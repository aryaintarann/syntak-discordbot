'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Guild {
    id: string
    name: string
    icon: string | null
    owner: boolean
    permissions: string
}

export default function DashboardPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [guilds, setGuilds] = useState<Guild[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/')
        } else if (status === 'authenticated') {
            fetchGuilds()
        }
    }, [status, router])

    const fetchGuilds = async () => {
        try {
            const res = await fetch('/api/guilds')
            if (res.ok) {
                const data = await res.json()
                setGuilds(data)
            }
        } catch (error) {
            console.error('Error fetching guilds:', error)
        } finally {
            setLoading(false)
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
            {/* Navbar */}
            <nav className="bg-black/20 backdrop-blur-md border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-xl">S</span>
                            </div>
                            <span className="text-white font-bold text-xl">Syntak Bot</span>
                        </Link>

                        <div className="flex items-center gap-4">
                            <span className="text-white">{session?.user?.name}</span>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-4xl font-bold text-white mb-8">Select a Server</h1>

                {guilds.length === 0 ? (
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 text-center">
                        <p className="text-xl text-purple-200">
                            No servers found. Make sure you have MANAGE_GUILD permission and the bot is invited to your server.
                        </p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {guilds.map((guild) => (
                            <Link
                                key={guild.id}
                                href={`/server/${guild.id}`}
                                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all hover:scale-105"
                            >
                                <div className="flex items-center gap-4">
                                    {guild.icon ? (
                                        <img
                                            src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                                            alt={guild.name}
                                            className="w-16 h-16 rounded-full"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                                            <span className="text-white font-bold text-2xl">
                                                {guild.name.charAt(0)}
                                            </span>
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{guild.name}</h3>
                                        {guild.owner && (
                                            <span className="text-sm text-yellow-400">Owner</span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
