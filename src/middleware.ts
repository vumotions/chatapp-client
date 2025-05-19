import { getToken } from 'next-auth/jwt'
import { withAuth } from 'next-auth/middleware'
import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import nextEnv from './config/next-env'
import { routing } from './i18n/routing'
import { checkAuthRoute, checkPrivateRoute, checkPublicRoute } from './lib/utils'

const intlMiddleware = createMiddleware(routing)

const authMiddleware = withAuth(
  (req) => {
    return intlMiddleware(req)
  },
  {
    secret: nextEnv.NEXTAUTH_SECRET,
    callbacks: {
      authorized: ({ token }) => !!token
    },
    pages: {
      signIn: '/auth/login'
    }
  }
)

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: nextEnv.NEXTAUTH_SECRET })
  const isAuthenticated = !!token
  const { pathname } = req.nextUrl

  const isPublicRoute = checkPublicRoute(pathname)
  const isAuthRoute = checkAuthRoute(pathname)
  const isPrivateRoute = checkPrivateRoute(pathname)

  if (isAuthenticated && isAuthRoute) {
    const previousUrl = req.headers.get('referer') || '/'
    return NextResponse.redirect(new URL(previousUrl, req.url))
  }

  if (isPrivateRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  if (isPublicRoute || isAuthRoute) {
    return intlMiddleware(req)
  } else {
    return (authMiddleware as any)(req)
  }
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
}
