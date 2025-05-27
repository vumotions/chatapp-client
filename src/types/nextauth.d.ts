import 'next-auth'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    refreshToken?: string
    accessTokenExpiresAt?: number
    user?: {
      _id: string
      username: string
      email: string
      name: string
      avatar?: string
      bio?: string
      coverPhoto?: string
      dateOfBirth: string
      verify: string
      isBot: boolean
      createdBy: null
      emailLockedUntil: null
      createdAt: string
      updatedAt: string
      __v: number
    }
  }
}
