import { NextRequestWithAuth, withAuth } from 'next-auth/middleware'
import createMiddleware from 'next-intl/middleware'
import { LOCALES } from './constants/locales'
import { routing } from './i18n/routing'
import nextEnv from './config/env'

const privatePaths = ['/', '/auth/login', '/auth/register']
const publicPaths = []

const intlMiddleware = createMiddleware(routing)

const authMiddleware = withAuth(
  (req) => {
    return intlMiddleware(req)
  },
  {
    secret: nextEnv.NEXTAUTH_SECRET,
    callbacks: {
      authorized: ({ token }) => token != null
    },
    pages: {
      signIn: '/auth/login'
    }
  }
)

export async function middleware(req: NextRequestWithAuth) {
  const isAuthenticated = req.nextauth?.token
  const { pathname } = req.nextUrl
  const publicPathnameRegex = RegExp(
    `^(/(${LOCALES.join('|')}))?(${privatePaths.flatMap((p) => (p === '/' ? ['', '/'] : p)).join('|')})/?$`,
    'i'
  )
  const isPublicRoute = publicPathnameRegex.test(req.nextUrl.pathname)
  console.log({ pathname, isAuthenticated, isPublicRoute })
  if (isPublicRoute) {
    return intlMiddleware(req)
  } else {
    return (authMiddleware as any)(req)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|trpc|_next|_vercel|.*\\..*).*)'
  ]
}
