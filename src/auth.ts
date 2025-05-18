import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'

import { omit } from 'lodash'
import httpRequest from './config/http-request'
import nextEnv from './config/next-env'
import { refreshToken } from './lib/utils'
import { LoginResponse } from './types/auth.types'
import authService from './services/auth.service'

const auth: AuthOptions = {
  pages: {
    error: '/auth/login',
    signIn: '/auth/login'
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          const response = await httpRequest.post('/auth/login', credentials)
          
          // Đảm bảo trả về đúng định dạng dữ liệu
          return {
            id: response.data.data.user._id,
            ...response.data.data.user,
            accessToken: response.data.data.tokens.accessToken,
            refreshToken: response.data.data.tokens.refreshToken,
            accessTokenExpiresAt: response.data.data.tokens.accessTokenExpiresAt
          }
        } catch (error: any) {
          console.error('Login error:', error)
          if (error?.isAxiosError) {
            const errorData = {
              status: error.response?.status,
              data: error.response?.data
            };
            throw new Error(JSON.stringify(errorData));
          }

          throw new Error(JSON.stringify({
            message: error?.message || 'An unexpected error occurred'
          }));
        }
      }
    }),
    GoogleProvider({
      clientId: nextEnv.GOOGLE_CLIENT_ID,
      clientSecret: nextEnv.GOOGLE_CLIENT_SECRET
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        if (account.provider === 'credentials') {
          return {
            ...token,
            ...user,
            accessToken: user.accessToken,
            refreshToken: user.refreshToken,
            accessTokenExpiresAt: user.accessTokenExpiresAt
          }
        }

        if (account.provider === 'google') {
          try {
            const response = await authService.loginWithGoogle({
              accessToken: account.access_token as string
            })

            const { user: userData, tokens } = response.data.data

            return {
              ...token,
              ...omit(userData, ['password']),
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              accessTokenExpiresAt: tokens.accessTokenExpiresAt
            }
          } catch (error) {
            console.error('Error in Google login:', error)
            return { ...token, error: 'GoogleLoginError' }
          }
        }
      }

      // Return previous token if the access token has not expired yet
      if (token.accessTokenExpiresAt && Date.now() / 1000 < (token.accessTokenExpiresAt as number)) {
        return token
      }

      // Access token has expired, try to update it
      try {
        const refreshedToken = await refreshToken(token)
        return refreshedToken
      } catch (error) {
        console.error('Error refreshing token:', error)
        return { ...token, error: 'RefreshAccessTokenError' }
      }
    },
    async session({ session, token }) {
      session.user = token as any
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      session.accessTokenExpiresAt = token.accessTokenExpiresAt as number
      session.error = token.error
      return session
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  secret: nextEnv.NEXTAUTH_SECRET
}

export default auth
