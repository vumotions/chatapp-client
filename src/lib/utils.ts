import axios, { AxiosError } from 'axios'
import { clsx, type ClassValue } from 'clsx'
import { status } from 'http-status'
import Cookies from 'js-cookie'
import { match } from 'path-to-regexp'
import { twMerge } from 'tailwind-merge'
import nextEnv from '~/config/next-env'
import { LOCALES } from '~/constants/locales'
import routes from '~/routes'
import { RememberedAccount } from '~/types/user.types'
import { decrypt, encrypt } from './crypto'

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

const stripLocale = (pathname: string): string => {
  const parts = pathname.split('/')
  if (LOCALES.includes(parts[1])) {
    return '/' + parts.slice(2).join('/')
  }
  return pathname
}

const createMatchers = (routes: string[]) => {
  return routes.map((route) => match(route, { decode: decodeURIComponent }))
}

const publicMatchers = createMatchers(routes.publicRoutes)
const authMatchers = createMatchers(routes.authRoutes)
const privateMatchers = createMatchers(routes.privateRoutes)

export const checkPublicRoute = (pathname: string) => {
  const cleanPath = stripLocale(pathname)
  return publicMatchers.some((m) => m(cleanPath))
}

export const checkAuthRoute = (pathname: string) => {
  const cleanPath = stripLocale(pathname)
  return authMatchers.some((m) => m(cleanPath))
}

export const checkPrivateRoute = (pathname: string) => {
  const cleanPath = stripLocale(pathname)
  return privateMatchers.some((m) => m(cleanPath))
}

export const isAxiosError = <T>(error: unknown): error is AxiosError<T> => {
  return axios.isAxiosError(error)
}

export const isAxiosUnprocessableEntityError = <UnprocessableEntityError>(
  error: unknown
): error is AxiosError<UnprocessableEntityError> => {
  return isAxiosError<UnprocessableEntityError>(error) && error.response?.status === status.UNPROCESSABLE_ENTITY
}

export const isAxiosUnauthorizedError = <UnauthorizedError>(error: unknown): error is AxiosError<UnauthorizedError> => {
  return isAxiosError<UnauthorizedError>(error) && error.response?.status === status.UNAUTHORIZED
}

export const isAccessTokenExpiredError = (error: unknown) => {
  return (
    isAxiosUnauthorizedError<{ name: string; message: string }>(error) &&
    error.response?.data.name === 'ACCESS_TOKEN_EXPIRED_ERROR'
  )
}

export const setRememberedAccountToCookie = (account: RememberedAccount) => {
  Cookies.set('credentials', encrypt(JSON.stringify(account)), { expires: 365 })
}

export const isBrowser = typeof window !== 'undefined'

export const getRememberedAccountFromCookie = (): RememberedAccount | null => {
  try {
    const encrypted = Cookies.get('credentials')
    const decrypted = decrypt(encrypted || '')
    return JSON.parse(decrypted)
  } catch {
    return null
  }
}

export const removeRememberedAccountFromCookie = () => {
  Cookies.remove('credentials')
}

export const refreshToken = async (token: any) => {
  try {
    if (!token.refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await axios.post(
      `${nextEnv.NEXT_PUBLIC_SERVER_URL}/api/auth/refresh-token`,
      { refreshToken: token.refreshToken }
    )

    const { tokens } = response.data.data

    return {
      ...token,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      error: undefined
    }
  } catch (error) {
    console.error('Error refreshing token:', error)
    return {
      ...token,
      error: 'RefreshAccessTokenError'
    }
  }
}

export const formatMessageContent = (content: string) => {
  // Basic implementation to handle message content formatting
  return content || 'Empty message'
}

