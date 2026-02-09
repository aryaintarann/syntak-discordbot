'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'

interface LogConfig {
    enabled: boolean
    channelId: string | null
}

interface LoggingSettings {
    modLog: LogConfig
    messageLog: LogConfig
    joinLeaveLog: LogConfig
    voiceLog: LogConfig
    roleLog: LogConfig
}

interface Channel {
    id: string
    name: string
    type: number
}

export default function LoggingPage() {
    const { status } = useSession()
    const router = useRouter()
    const params = useParams()
    const serverId = params.id as string

    const [settings, setSettings] = useState<LoggingSettings | null>(null)
    const [channels, setChannels] = useState<Channel[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saveMessage, setSaveMessage] = useState('')

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/')
        } else if (status === 'authenticated') {
            fetchData()
        }
    }, [status, router, serverId])

    const fetchData = async () => {
        try {
            // Fetch Channels
            const channelsRes = await fetch(`/api/guilds/${serverId}/channels`)
            if (channelsRes.ok) {
                const data = await channelsRes.json()
                // Filter for text channels (type 0)
                setChannels(data.filter((c: any) => c.type === 0))
            }

            // Fetch Settings
            const settingsRes = await fetch(`/api/guilds/${serverId}/logging`)
            if (settingsRes.ok) {
                const data = await settingsRes.json()
                setSettings(data)
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const updateSetting = (key: keyof LoggingSettings, field: keyof LogConfig, value: any) => {
        if (!settings) return
        setSettings({
            ...settings,
            [key]: {
                ...settings[key],
                [field]: value
            }
        })
    }

    const handleSave = async () => {
        if (!settings) return
        setSaving(true)
        setSaveMessage('')

        try {
            const res = await fetch(`/api/guilds/${serverId}/logging`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            })

            if (res.ok) {
                setSaveMessage('✅ Konfigurasi berhasil disimpan!')
            } else {
                setSaveMessage('❌ Gagal menyimpan konfigurasi')
            }
        } catch (error) {
            setSaveMessage('❌ Error menyimpan konfigurasi')
        } finally {
            setSaving(false)
            setTimeout(() => setSaveMessage(''), 3000)
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
                <Sidebar serverId={serverId} />
                <main style={{ flex: 1, padding: '2rem', marginLeft: '256px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ color: 'white', fontSize: '1.2rem' }}>Loading...</div>
                </main>
            </div>
        )
    }

    const logTypes = [
        { id: 'modLog', name: '🛡️ Moderation Log', desc: 'Log bans, kicks, mutes, warnings' },
        { id: 'messageLog', name: '💬 Message Log', desc: 'Log deleted and edited messages' },
        { id: 'joinLeaveLog', name: '👋 Join/Leave Log', desc: 'Log member joins and leaves' },
        { id: 'voiceLog', name: '🎤 Voice Log', desc: 'Log voice channel activity' },
        { id: 'roleLog', name: '🎭 Role Log', desc: 'Log role changes' }
    ]

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
            <Sidebar serverId={serverId} />

            <main style={{ flex: 1, padding: '2rem', marginLeft: '256px', overflowY: 'auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>
                        📋 Logging Configuration
                    </h1>
                    <p style={{ color: '#aaa', margin: 0 }}>
                        Atur channel untuk menyimpan log aktivitas server
                    </p>
                </div>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {settings && logTypes.map((type) => {
                        const config = settings[type.id as keyof LoggingSettings]
                        return (
                            <div key={type.id} style={{
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '12px',
                                padding: '1.5rem',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div>
                                        <h3 style={{ color: 'white', margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>{type.name}</h3>
                                        <p style={{ color: '#888', margin: 0, fontSize: '0.9rem' }}>{type.desc}</p>
                                    </div>

                                    <label style={{ position: 'relative', display: 'inline-block', width: 50, height: 26 }}>
                                        <input
                                            type="checkbox"
                                            checked={config?.enabled || false}
                                            onChange={(e) => updateSetting(type.id as keyof LoggingSettings, 'enabled', e.target.checked)}
                                            style={{ opacity: 0, width: 0, height: 0 }}
                                        />
                                        <span style={{
                                            position: 'absolute', cursor: 'pointer',
                                            top: 0, left: 0, right: 0, bottom: 0,
                                            backgroundColor: config?.enabled ? '#4CAF50' : '#555',
                                            transition: '0.3s', borderRadius: 26
                                        }}>
                                            <span style={{
                                                position: 'absolute', content: '""',
                                                height: 20, width: 20,
                                                left: config?.enabled ? 26 : 3, bottom: 3,
                                                backgroundColor: 'white', transition: '0.3s', borderRadius: '50%'
                                            }}></span>
                                        </span>
                                    </label>
                                </div>

                                {config?.enabled && (
                                    <div style={{ marginTop: '1rem' }}>
                                        <label style={{ display: 'block', color: '#ccc', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                            Select Channel
                                        </label>
                                        <select
                                            value={config.channelId || ''}
                                            onChange={(e) => updateSetting(type.id as keyof LoggingSettings, 'channelId', e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '1rem'
                                            }}
                                        >
                                            <option value="">-- Select a channel --</option>
                                            {channels.map(channel => (
                                                <option key={channel.id} value={channel.id}>
                                                    #{channel.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Save Button */}
                <div style={{
                    position: 'sticky', bottom: '1rem',
                    display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'flex-end',
                    padding: '1rem', marginTop: '2rem',
                    background: 'rgba(26, 26, 46, 0.95)',
                    borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    {saveMessage && (
                        <span style={{ color: saveMessage.includes('✅') ? '#4CAF50' : '#f44336' }}>
                            {saveMessage}
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            padding: '0.75rem 2rem',
                            background: saving ? '#555' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white', border: 'none', borderRadius: '8px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            fontWeight: 600, fontSize: '1rem'
                        }}
                    >
                        {saving ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                    </button>
                </div>
            </main>
        </div>
    )
}
