'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import Link from 'next/link'

export default function HomePage() {
  const { data: session, status } = useSession()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Navbar */}
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <span className="text-white font-bold text-xl">Syntak Bot</span>
            </div>

            <div>
              {status === 'loading' ? (
                <div className="h-10 w-24 bg-white/10 animate-pulse rounded-lg"></div>
              ) : session ? (
                <div className="flex items-center gap-4">
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-all"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn('discord')}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-indigo-500/50"
                >
                  Login with Discord
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Manage Your Discord Server
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              With Ease
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-purple-200 mb-12 max-w-3xl mx-auto">
            Powerful moderation, auto-mod, anti-raid, and more. All manageable from our intuitive web dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {session ? (
              <Link
                href="/dashboard"
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-lg rounded-lg transition-all shadow-2xl hover:shadow-purple-500/50"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <button
                  onClick={() => signIn('discord')}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-lg rounded-lg transition-all shadow-2xl hover:shadow-purple-500/50"
                >
                  Get Started
                </button>
                <a
                  href="https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold text-lg rounded-lg transition-all backdrop-blur-sm border border-white/20"
                >
                  Invite Bot
                </a>
              </>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-8 hover:bg-white/10 transition-all">
            <div className="text-4xl mb-4">🛡️</div>
            <h3 className="text-xl font-bold text-white mb-2">Moderation Tools</h3>
            <p className="text-purple-200">Ban, kick, timeout, and more. Keep your server safe.</p>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-8 hover:bg-white/10 transition-all">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-bold text-white mb-2">Auto-Moderation</h3>
            <p className="text-purple-200">Automated spam detection, word filters, and more.</p>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-8 hover:bg-white/10 transition-all">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold text-white mb-2">Anti-Raid Protection</h3>
            <p className="text-purple-200">Protect against raids with auto-lockdown and verification.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
