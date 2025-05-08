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
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'Enter your email'
        },
        password: {
          label: 'Password',
          type: 'password',
          placeholder: 'Enter your password'
        }
      },
      async authorize(credentials) {
        try {
          const response = await httpRequest.post<LoginResponse>('/auth/login', credentials)
          return {
            ...response.data.data.user,
            ...response.data.data.tokens
          } as any
        } catch (error: any) {
          if (error?.isAxiosError) {
            throw new Error(
              JSON.stringify({
                status: error.response?.status,
                data: error.response?.data
              })
            )
          }

          throw new Error(error?.message || 'An unexpected error occurred')
        }
      }
    }),
    GoogleProvider({
      clientId: nextEnv.GOOGLE_CLIENT_ID,
      clientSecret: nextEnv.GOOGLE_CLIENT_SECRET
    })
  ],
  session: {
    strategy: 'jwt'
  },
  secret: nextEnv.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ account, profile, user }: any) {
      if (account.provider === 'google' || account?.provider === 'github') {
        const response = await httpRequest.post<LoginResponse>('/auth/oauth-login', {
          provider: account.provider,
          providerId: account.providerAccountId,
          email: profile.email,
          name: profile.name,
          avatar: profile.picture
        })
        const data = response.data.data

        if (data) {
          // Cập nhật trực tiếp thông tin của user từ API vào đối tượng user
          user._id = data.user._id
          user.username = data.user.username
          user.email = data.user.email
          user.name = data.user.name
          user.dateOfBirth = data.user.dateOfBirth
          user.verify = data.user.verify
          user.isBot = data.user.isBot
          user.createdBy = data.user.createdBy
          user.emailLockedUntil = data.user.emailLockedUntil
          user.createdAt = data.user.createdAt
          user.updatedAt = data.user.updatedAt
          user.__v = data.user.__v
          user.accessToken = data.tokens.accessToken
          user.refreshToken = data.tokens.refreshToken
          user.accessTokenExpiresAt = data.tokens.accessTokenExpiresAt
        }

        return profile.email_verified
      }
      return true
    },

    async redirect({ url, baseUrl }: any) {
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }

      if (new URL(url).origin === baseUrl) {
        return url
      }

      return baseUrl
    },
    /**
     * The session callback is called whenever a session is checked
     * e.g.: calls to getSession(), useSession(), or request to /api/auth/session
     * Refer: https://next-auth.js.org/configuration/callbacks#session-callback
     */
    async session({ session, token, user }: any) {
      // Send properties to the client, like an access_token from a provider.
      session.user = token.user
      session.accessToken = token.accessToken
      session.refreshToken = token.refreshToken
      session.accessTokenExpiresAt = token.accessTokenExpiresAt
      return session
    },
    /**
     * This callback is called whenever a JSON Web Token is created (i.e. at sign in) or updated (i.e whenever a session is accessed in the client)
     * e.g.: requests to /api/auth/signin, /api/auth/session and calls to getSession(), getServerSession(), useSession()
     * Refer: https://next-auth.js.org/configuration/callbacks#jwt-callback
     */
    async jwt({ token, user, account, session, trigger }: any) {
      // Update tokens after refresh token
      if (trigger === 'update' && session?.accessToken && session?.refreshToken) {
        token.accessToken = session.accessToken
        token.refreshToken = session.refreshToken
        token.accessTokenExpiresAt = session.accessTokenExpiresAt
      }
      // Persist the OAuth access_token to the token right after signin
      if (user) {
        token.accessToken = user?.access_token || user?.accessToken
        token.refreshToken = user?.refresh_token || user?.refreshToken
        token.accessTokenExpiresAt = user?.accessTokenExpiresAt
        token.user = omit(user, ['accessToken', 'refreshToken', 'accessTokenExpiresAt'])
      } else if (account) {
        token.accessToken = account.access_token || account.accessToken
        token.refreshToken = token?.refresh_token || token?.refreshToken
      }

      return token
    }
  },
  events: {
    async signOut({ token }: any) {
      try {
        // Logout logic
        await authService.logout(token?.refreshToken as string)
      } catch (error) {
        console.log('Error while logging out')
      }
    }
  }
}

export default auth
