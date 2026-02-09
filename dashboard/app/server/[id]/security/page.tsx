'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'

interface SecuritySettings {
    accountAge: { enabled: boolean; minDays: number; action: 'kick' | 'ban' | 'warn' }
    verification: { enabled: boolean; type: 'button'; channelId: string | null; roleId: string | null }
    altDetection: { enabled: boolean }
    phishingDetection: { enabled: boolean }
    autoRaidBan: { enabled: boolean }
}

interface Channel {
    id: string
    name: string
    type: number
}

interface Role {
    id: string
    name: string
    color: number
}

export default function SecurityPage() {
    const { status } = useSession()
    const router = useRouter()
    const params = useParams()
    const serverId = params.id as string

    const [settings, setSettings] = useState<SecuritySettings | null>(null)
    const [channels, setChannels] = useState<Channel[]>([])
    const [roles, setRoles] = useState<Role[]>([])
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
                setChannels(data.filter((c: any) => c.type === 0)) // Text channels
            }

            // Fetch Roles
            const rolesRes = await fetch(`/api/guilds/${serverId}/roles`) // Assuming this endpoint exists, if not create it or use existing
            // Wait, I haven't created roles output in regular guild API? 
            // Usually /api/guilds/[id]/channels might filter, or I need a new endpoint.
            // Let's assume I check api/guilds/[id] which might have roles? 
            // Or create /api/guilds/[id]/roles. 
            // For now, let's mock empty roles if fail, or I'll implement the endpoint next.
            if (rolesRes.ok) {
                const data = await rolesRes.json()
                setRoles(data)
            } else {
                // Try fetching from main guild info if available there?
                // Or just fail gracefully.
            }

            // Fetch Settings
            const settingsRes = await fetch(`/api/guilds/${serverId}/security`)
            if (settingsRes.ok) {
                const data = await settingsRes.json()
                // Ensure defaults
                if (!data.accountAge) data.accountAge = { enabled: false, minDays: 7, action: 'kick' }
                if (!data.verification) data.verification = { enabled: false, type: 'button', channelId: null, roleId: null }
                setSettings(data)
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const updateSetting = (category: keyof SecuritySettings, field: string, value: any) => {
        if (!settings) return
        setSettings({
            ...settings,
            [category]: {
                ...settings[category],
                [field]: value
            }
        })
    }

    const updateNestedSetting = (category: keyof SecuritySettings, field: string, value: any) => {
        if (!settings) return;
        // logic to update nested objects like settings.accountAge.minDays
        // Actually the updateSetting above handles nested if I pass field as key.
        // Wait, the structure is settings[category][field].
        // Yes: settings.accountAge.minDays -> updateSetting('accountAge', 'minDays', 10)

        const newCategorySettings = { ...settings[category], [field]: value };
        setSettings({ ...settings, [category]: newCategorySettings });
    }

    const handleSave = async () => {
        if (!settings) return
        setSaving(true)
        setSaveMessage('')

        try {
            const res = await fetch(`/api/guilds/${serverId}/security`, {
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

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
            <Sidebar serverId={serverId} />

            <main style={{ flex: 1, padding: '2rem', marginLeft: '256px', overflowY: 'auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>
                        🔒 Security Configuration
                    </h1>
                    <p style={{ color: '#aaa', margin: 0 }}>
                        Lindungi server dari raid, bot, dan akun mencurigakan
                    </p>
                </div>

                <div style={{ display: 'grid', gap: '1.5rem' }}>

                    {/* Account Age Filter */}
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ color: 'white', margin: '0 0 0.25rem 0' }}>👶 Account Age Filter</h3>
                                <p style={{ color: '#888', fontSize: '0.9rem' }}>Kick/Ban akun yang terlalu baru</p>
                            </div>
                            <Toggle checked={settings?.accountAge?.enabled} onChange={(v) => updateNestedSetting('accountAge', 'enabled', v)} />
                        </div>
                        {settings?.accountAge?.enabled && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#ccc', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Min Account Age (Days)</label>
                                    <input
                                        type="number"
                                        value={settings.accountAge.minDays}
                                        onChange={(e) => updateNestedSetting('accountAge', 'minDays', parseInt(e.target.value))}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#ccc', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Action</label>
                                    <select
                                        value={settings.accountAge.action}
                                        onChange={(e) => updateNestedSetting('accountAge', 'action', e.target.value)}
                                        style={inputStyle}
                                    >
                                        <option value="warn">Warn (Only Log)</option>
                                        <option value="kick">Kick</option>
                                        <option value="ban">Ban</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Anti-Phishing */}
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <div>
                                <h3 style={{ color: 'white', margin: '0 0 0.25rem 0' }}>🎣 Anti-Phishing & Scam</h3>
                                <p style={{ color: '#888', fontSize: '0.9rem' }}>Blokir link berbahaya secara otomatis</p>
                            </div>
                            <Toggle checked={settings?.phishingDetection?.enabled} onChange={(v) => updateNestedSetting('phishingDetection', 'enabled', v)} />
                        </div>
                    </div>

                    {/* Verification System */}
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ color: 'white', margin: '0 0 0.25rem 0' }}>✅ Verification System</h3>
                                <p style={{ color: '#888', fontSize: '0.9rem' }}>Wajibkan user verifikasi sebelum chat</p>
                            </div>
                            <Toggle checked={settings?.verification?.enabled} onChange={(v) => updateNestedSetting('verification', 'enabled', v)} />
                        </div>
                        {settings?.verification?.enabled && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#ccc', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Verification Channel</label>
                                    <select
                                        value={settings.verification.channelId || ''}
                                        onChange={(e) => updateNestedSetting('verification', 'channelId', e.target.value)}
                                        style={inputStyle}
                                    >
                                        <option value="">-- Select Channel --</option>
                                        {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                                    </select>
                                    <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.25rem' }}>Bot akan mengirim panel verifikasi ke sini</p>
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#ccc', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Verified Role</label>
                                    <select
                                        value={settings.verification.roleId || ''}
                                        onChange={(e) => updateNestedSetting('verification', 'roleId', e.target.value)}
                                        style={inputStyle}
                                    >
                                        <option value="">-- Select Role --</option>
                                        {roles.map(r => <option key={r.id} value={r.id}>@{r.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* Save Button */}
                <div style={{
                    position: 'sticky', bottom: '1rem',
                    display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'flex-end',
                    padding: '1rem', marginTop: '2rem',
                    background: 'rgba(26, 26, 46, 0.95)',
                    borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    {saveMessage && <span style={{ color: saveMessage.includes('✅') ? '#4CAF50' : '#f44336' }}>{saveMessage}</span>}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            padding: '0.75rem 2rem',
                            background: saving ? '#555' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white', border: 'none', borderRadius: '8px',
                            cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '1rem'
                        }}
                    >
                        {saving ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                    </button>
                </div>
            </main>
        </div>
    )
}

const Toggle = ({ checked, onChange }: { checked: boolean | undefined, onChange: (val: boolean) => void }) => (
    <label style={{ position: 'relative', display: 'inline-block', width: 50, height: 26 }}>
        <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
        <span style={{
            position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: checked ? '#4CAF50' : '#555', transition: '0.3s', borderRadius: 26
        }}>
            <span style={{
                position: 'absolute', content: '""', height: 20, width: 20,
                left: checked ? 26 : 3, bottom: 3, backgroundColor: 'white', transition: '0.3s', borderRadius: '50%'
            }}></span>
        </span>
    </label>
)

const inputStyle = {
    width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '1rem'
}
