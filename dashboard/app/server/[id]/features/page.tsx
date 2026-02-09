'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'

interface FeatureConfig {
    features: {
        moderation: {
            purge: { enabled: boolean }
            slowmode: { enabled: boolean }
            mute: { enabled: boolean }
            history: { enabled: boolean }
            note: { enabled: boolean }
            case: { enabled: boolean }
            roleall: { enabled: boolean }
        }
        logging: {
            modLog: { enabled: boolean; channelId: string | null }
            messageLog: { enabled: boolean; channelId: string | null }
            joinLeaveLog: { enabled: boolean; channelId: string | null }
            voiceLog: { enabled: boolean; channelId: string | null }
            roleLog: { enabled: boolean; channelId: string | null }
        }
        security: {
            accountAge: { enabled: boolean; minDays: number; action: string }
            verification: { enabled: boolean; type: string; channelId: string | null; roleId: string | null }
            altDetection: { enabled: boolean }
            phishingDetection: { enabled: boolean }
            autoRaidBan: { enabled: boolean }
        }
        automod: {
            escalatingPunishment: { enabled: boolean; thresholds: { warnToTimeout: number; timeoutToBan: number } }
            duplicateDetection: { enabled: boolean; threshold: number; timeWindow: number }
            emojiSpam: { enabled: boolean; maxEmojis: number }
            newlineSpam: { enabled: boolean; maxNewlines: number }
            regexFilters: Array<{ pattern: string; action: string; reason: string }>
        }
    }
}

interface GuildInfo {
    id: string
    name: string
    icon: string | null
}

export default function FeaturesPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const params = useParams()
    const serverId = params.id as string

    const [guildInfo, setGuildInfo] = useState<GuildInfo | null>(null)
    const [config, setConfig] = useState<FeatureConfig | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saveMessage, setSaveMessage] = useState('')

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/')
        } else if (status === 'authenticated') {
            fetchGuildInfo()
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

    const fetchConfig = async () => {
        try {
            const res = await fetch(`/api/guilds/${serverId}/features`)
            if (res.ok) {
                const data = await res.json()
                setConfig(data)
            }
        } catch (error) {
            console.error('Error fetching config:', error)
        } finally {
            setLoading(false)
        }
    }

    const updateFeature = (category: string, feature: string, key: string, value: any) => {
        if (!config) return

        setConfig({
            ...config,
            features: {
                ...config.features,
                [category]: {
                    ...config.features[category as keyof typeof config.features],
                    [feature]: {
                        ...(config.features[category as keyof typeof config.features] as any)[feature],
                        [key]: value
                    }
                }
            }
        })
    }

    const toggleFeature = (category: string, feature: string) => {
        if (!config) return
        const currentValue = (config.features[category as keyof typeof config.features] as any)[feature].enabled
        updateFeature(category, feature, 'enabled', !currentValue)
    }

    const handleSave = async () => {
        if (!config) return
        setSaving(true)
        setSaveMessage('')

        try {
            const res = await fetch(`/api/guilds/${serverId}/features`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
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

    const featureCategories = [
        {
            id: 'moderation',
            title: '⚔️ Moderation Commands',
            description: 'Aktifkan/nonaktifkan command moderasi',
            features: [
                { id: 'purge', name: '/purge', desc: 'Hapus banyak pesan sekaligus' },
                { id: 'slowmode', name: '/slowmode', desc: 'Set slowmode pada channel' },
                { id: 'mute', name: '/mute & /unmute', desc: 'Role-based mute' },
                { id: 'history', name: '/history', desc: 'Lihat riwayat moderasi user' },
                { id: 'note', name: '/note', desc: 'Tambah catatan untuk user' },
                { id: 'case', name: '/case', desc: 'Lihat detail case moderasi' },
                { id: 'roleall', name: '/roleall', desc: 'Beri/hapus role dari semua member' }
            ]
        },

        {
            id: 'security',
            title: '🔒 Security Features',
            description: 'Fitur keamanan server',
            features: [
                { id: 'accountAge', name: 'Account Age Filter', desc: 'Block akun baru (< X hari)' },
                { id: 'verification', name: 'Verification System', desc: 'Verifikasi member baru' },
                { id: 'altDetection', name: 'Alt Detection', desc: 'Deteksi akun alt' },
                { id: 'phishingDetection', name: 'Phishing Detection', desc: 'Block link phishing/scam' },
                { id: 'autoRaidBan', name: 'Auto Raid Ban', desc: 'Ban otomatis saat raid' }
            ]
        },
        {
            id: 'automod',
            title: '🤖 AutoMod Improvements',
            description: 'Fitur automod tambahan',
            features: [
                { id: 'escalatingPunishment', name: 'Escalating Punishment', desc: 'Hukuman bertingkat (warn→timeout→ban)' },
                { id: 'duplicateDetection', name: 'Duplicate Detection', desc: 'Deteksi pesan duplikat/copy-paste' },
                { id: 'emojiSpam', name: 'Emoji Spam Filter', desc: 'Limit emoji per pesan' },
                { id: 'newlineSpam', name: 'Newline Spam Filter', desc: 'Limit baris kosong per pesan' }
            ]
        }
    ]

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
            <Sidebar serverId={serverId} />

            <main style={{ flex: 1, padding: '2rem', marginLeft: '256px', overflowY: 'auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        {guildInfo?.icon && (
                            <img src={guildInfo.icon} alt="" style={{ width: 48, height: 48, borderRadius: '50%' }} />
                        )}
                        <div>
                            <h1 style={{ color: 'white', margin: 0, fontSize: '1.8rem' }}>
                                🎛️ Feature Toggles
                            </h1>
                            <p style={{ color: '#888', margin: 0 }}>{guildInfo?.name}</p>
                        </div>
                    </div>
                    <p style={{ color: '#aaa', marginTop: '0.5rem' }}>
                        Aktifkan atau nonaktifkan fitur-fitur bot untuk server ini
                    </p>
                </div>

                {/* Feature Categories */}
                {config && featureCategories.map(category => (
                    <div key={category.id} style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        marginBottom: '1.5rem',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <h2 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '1.3rem' }}>
                            {category.title}
                        </h2>
                        <p style={{ color: '#888', margin: '0 0 1rem 0', fontSize: '0.9rem' }}>
                            {category.description}
                        </p>

                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {category.features.map(feature => {
                                const featureConfig = (config.features[category.id as keyof typeof config.features] as any)[feature.id]
                                const isEnabled = featureConfig?.enabled ?? false

                                return (
                                    <div key={feature.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '1rem',
                                        background: isEnabled ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255,255,255,0.03)',
                                        borderRadius: '8px',
                                        border: `1px solid ${isEnabled ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255,255,255,0.05)'}`
                                    }}>
                                        <div>
                                            <div style={{ color: 'white', fontWeight: 500 }}>{feature.name}</div>
                                            <div style={{ color: '#888', fontSize: '0.85rem' }}>{feature.desc}</div>
                                        </div>

                                        <label style={{ position: 'relative', display: 'inline-block', width: 50, height: 26 }}>
                                            <input
                                                type="checkbox"
                                                checked={isEnabled}
                                                onChange={() => toggleFeature(category.id, feature.id)}
                                                style={{ opacity: 0, width: 0, height: 0 }}
                                            />
                                            <span style={{
                                                position: 'absolute',
                                                cursor: 'pointer',
                                                top: 0, left: 0, right: 0, bottom: 0,
                                                backgroundColor: isEnabled ? '#4CAF50' : '#555',
                                                transition: '0.3s',
                                                borderRadius: 26
                                            }}>
                                                <span style={{
                                                    position: 'absolute',
                                                    content: '""',
                                                    height: 20, width: 20,
                                                    left: isEnabled ? 26 : 3,
                                                    bottom: 3,
                                                    backgroundColor: 'white',
                                                    transition: '0.3s',
                                                    borderRadius: '50%'
                                                }}></span>
                                            </span>
                                        </label>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}

                {/* Save Button */}
                <div style={{
                    position: 'sticky',
                    bottom: '1rem',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    padding: '1rem',
                    background: 'rgba(26, 26, 46, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)'
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
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: '1rem'
                        }}
                    >
                        {saving ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                    </button>
                </div>
            </main>
        </div>
    )
}
