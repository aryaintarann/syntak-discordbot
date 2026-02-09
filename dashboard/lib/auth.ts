import NextAuth, { NextAuthConfig } from "next-auth"
import Discord from "next-auth/providers/discord"

// Validate environment variables
const clientId = process.env.DISCORD_CLIENT_ID
const clientSecret = process.env.DISCORD_CLIENT_SECRET

if (!clientId || clientId === 'your_application_id') {
    console.error('\n❌ DISCORD_CLIENT_ID is not configured!')
    console.error('Please update .env.local with your Discord Application Client ID')
    console.error('Get it from: https://discord.com/developers/applications\n')
}

if (!clientSecret || clientSecret === 'your_client_secret') {
    console.error('\n❌ DISCORD_CLIENT_SECRET is not configured!')
    console.error('Please update .env.local with your Discord Application Client Secret')
    console.error('Get it from: https://discord.com/developers/applications\n')
}

export const authConfig: NextAuthConfig = {
    providers: [
        Discord({
            clientId: clientId || '',
            clientSecret: clientSecret || '',
            authorization: {
                params: {
                    scope: 'identify guilds'
                }
            }
        }),
    ],
    callbacks: {
        async jwt({ token, account, profile }) {
            if (account) {
                token.accessToken = account.access_token
                token.id = profile?.id as string
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string
                // @ts-ignore - accessToken is added in our custom type
                session.accessToken = token.accessToken as string
            }
            return session
        }
    },
    pages: {
        signIn: '/',
        error: '/error',
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    debug: process.env.NODE_ENV === 'development',
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
