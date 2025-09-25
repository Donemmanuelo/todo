import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Note: Avoid importing server-only modules (like Prisma) into middleware.
// We check the NextAuth session cookie directly in the Edge runtime.
// Cookie names used by Auth.js v5:
// - 'authjs.session-token' (HTTP)
// - '__Secure-authjs.session-token' (HTTPS)

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Public paths that don't require authentication
  const publicPaths = [
    '/auth/signin',
    '/auth/error',
    '/api/auth',
    '/_next',
    '/favicon.ico'
  ]

  const isPublicPath = publicPaths.some((publicPath) => path.startsWith(publicPath))
  if (isPublicPath) {
    return NextResponse.next()
  }

  // Check for session cookie
  const hasSession = Boolean(
    request.cookies.get('authjs.session-token')?.value ||
    request.cookies.get('__Secure-authjs.session-token')?.value
  )

  if (!hasSession) {
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(signInUrl)
  }

  // If authenticated, allow the request
  return NextResponse.next()
}

export const config = {
  // Match all paths except Next.js dev assets/endpoints and API routes (except auth)
  matcher: [
    '/((?!_next/|__nextjs|favicon.ico|api(?!/auth)).*)',
  ],
}
