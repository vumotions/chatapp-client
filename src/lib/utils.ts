import axios, { AxiosError } from 'axios'
import { clsx, type ClassValue } from 'clsx'
import { status } from 'http-status'
import Cookies from 'js-cookie'
import { twMerge } from 'tailwind-merge'
import { authRouteRegex, privateRouteRegex, publicRouteRegex } from '~/constants/regex'
import { RememberedAccount } from '~/types/user.types'
import { decrypt, encrypt } from './crypto'
export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

export const checkPublicRoute = (pathname: string) => {
  return publicRouteRegex.test(pathname)
}

export const checkAuthRoute = (pathname: string) => {
  return authRouteRegex.test(pathname)
}

export const checkPrivateRoute = (pathname: string) => {
  return privateRouteRegex.test(pathname)
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
