import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { publicRouteRegex, privateRouteRegex, authRouteRegex } from '~/constants/regex'

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
