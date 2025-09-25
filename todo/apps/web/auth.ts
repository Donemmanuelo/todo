import NextAuth from 'next-auth'
import Keycloak from 'next-auth/providers/keycloak'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/db'

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  // Use Prisma for persistence
  adapter: PrismaAdapter(prisma),
  // Explicitly set the secret. Prefer AUTH_SECRET for NextAuth v5, fall back to NEXTAUTH_SECRET for compatibility.
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  providers: [
    // Google OAuth (primary provider)
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            'openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
    // Keycloak (backup provider)
    Keycloak({
      clientId: process.env.KEYCLOAK_CLIENT_ID || 'todo-app',
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || 'todo-secret',
      issuer: process.env.KEYCLOAK_ISSUER || 'http://localhost:8080/realms/todo',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  // Note: allowDangerousEmailAccountLinking is not supported in this NextAuth version's types.
  // If you need to link accounts by email during development, handle it via callbacks or manual flows.
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.provider = account.provider
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.userId
        ;(session.user as any).accessToken = token.accessToken
        ;(session.user as any).provider = token.provider
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
})
