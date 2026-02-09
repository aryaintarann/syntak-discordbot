'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface SidebarProps {
    serverId: string
    serverName?: string
    serverIcon?: string | null
}

export default function Sidebar({ serverId, serverName, serverIcon }: SidebarProps) {
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)

    const menuItems = [
        { name: 'Configuration', icon: '⚙️', href: `/server/${serverId}` },
        { name: 'Auto-Moderation', icon: '🤖', href: `/server/${serverId}/automod` },
        { name: 'Statistics', icon: '📊', href: `/server/${serverId}/stats`, disabled: true },
        { name: 'Mod Logs', icon: '📝', href: `/server/${serverId}/logs`, disabled: true },
        { name: 'Users', icon: '👥', href: `/server/${serverId}/users`, disabled: true },
    ]

    return (
        <>
            {/* Mobile menu button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all"
            >
                {isOpen ? '✕' : '☰'}
            </button>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed top-0 left-0 h-full w-64 bg-black/20 backdrop-blur-md border-r border-white/10 
                    transform transition-transform duration-300 z-40
                    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                <div className="flex flex-col h-full pt-20 pb-4">
                    {/* Server Info */}
                    <div className="px-4 pb-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            {serverIcon ? (
                                <img
                                    src={serverIcon}
                                    alt={serverName || 'Server'}
                                    className="w-12 h-12 rounded-full"
                                />
                            ) : (
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-xl">
                                        {serverName?.charAt(0) || 'S'}
                                    </span>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h2 className="text-white font-semibold truncate">
                                    {serverName || 'Server'}
                                </h2>
                                <p className="text-purple-300 text-sm">Dashboard</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href
                            const isDisabled = item.disabled

                            return (
                                <Link
                                    key={item.href}
                                    href={isDisabled ? '#' : item.href}
                                    onClick={(e) => {
                                        if (isDisabled) e.preventDefault()
                                        else setIsOpen(false)
                                    }}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                                        ${isActive
                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                                            : isDisabled
                                                ? 'text-purple-400/50 cursor-not-allowed'
                                                : 'text-purple-200 hover:bg-white/10 hover:text-white'
                                        }
                                    `}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    <span className="font-medium">{item.name}</span>
                                    {isDisabled && (
                                        <span className="ml-auto text-xs bg-white/10 px-2 py-1 rounded">
                                            Soon
                                        </span>
                                    )}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Back to Dashboard */}
                    <div className="px-3 pt-4 border-t border-white/10">
                        <Link
                            href="/dashboard"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-purple-200 hover:bg-white/10 hover:text-white transition-all"
                        >
                            <span className="text-xl">←</span>
                            <span className="font-medium">All Servers</span>
                        </Link>
                    </div>
                </div>
            </aside>
        </>
    )
}
