import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    refreshToken?: string
    accessTokenExpiresAt?: number
    error?: string
    user: {
      id: string
      _id: string
      email: string
      name: string
      avatar?: string
      verify?: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    accessTokenExpiresAt?: number
    error?: string
    id?: string
    _id?: string
    email?: string
    name?: string
    avatar?: string
    verify?: string
  }
}