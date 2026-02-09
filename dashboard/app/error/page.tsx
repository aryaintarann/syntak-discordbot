'use client'

import Link from 'next/link'

export default function ErrorPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-8">
                <h1 className="text-4xl font-bold text-white mb-4">Authentication Error</h1>

                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6 mb-6">
                    <p className="text-red-200 mb-4">
                        Failed to authenticate with Discord. This usually happens when:
                    </p>
                    <ul className="list-disc list-inside text-red-200 space-y-2">
                        <li>Discord OAuth credentials are not configured</li>
                        <li>Redirect URI is not added in Discord Developer Portal</li>
                        <li>Application Client ID or Secret is incorrect</li>
                    </ul>
                </div>

                <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-bold text-white mb-3">Setup Instructions:</h2>
                    <ol className="list-decimal list-inside text-blue-200 space-y-2">
                        <li>Go to <a href="https://discord.com/developers/applications" target="_blank" className="underline">Discord Developer Portal</a></li>
                        <li>Select your application</li>
                        <li>Copy CLIENT_ID and CLIENT_SECRET from OAuth2 tab</li>
                        <li>Update <code className="bg-black/30 px-2 py-1 rounded">dashboard/.env.local</code></li>
                        <li>Add redirect URL: <code className="bg-black/30 px-2 py-1 rounded">http://localhost:3000/api/auth/callback</code></li>
                        <li>Restart the dashboard server</li>
                    </ol>
                </div>

                <Link
                    href="/"
                    className="block w-full text-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all"
                >
                    Back to Home
                </Link>
            </div>
        </div>
    )
}
