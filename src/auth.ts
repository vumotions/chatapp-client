import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import nextEnv from './config/next-env'
import authService from './services/auth.service'

const auth: AuthOptions = {
  logger: {
    error(code, metadata) {
      console.error(code, metadata)
    },
    warn(code) {
      console.warn(code)
    },
    debug(code, metadata) {
      console.debug(code, metadata)
    }
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
      async authorize(credentials, req) {
        try {
          const response = await authService.login(credentials as any)
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
  secret: nextEnv.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ account, profile }: any) {
      if (account.provider === 'google') {
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
    async session({ session, token }: any) {
      // Send properties to the client, like an access_token from a provider.
      session.accessToken = token.accessToken
      session.refreshToken = token.refreshToken
      return session
    },
    /**
     * This callback is called whenever a JSON Web Token is created (i.e. at sign in) or updated (i.e whenever a session is accessed in the client)
     * e.g.: requests to /api/auth/signin, /api/auth/session and calls to getSession(), getServerSession(), useSession()
     * Refer: https://next-auth.js.org/configuration/callbacks#jwt-callback
     */
    async jwt({ token, user, account }: any) {
      // Persist the OAuth access_token to the token right after signin
      if (user) {
        token.accessToken = user?.access_token || user?.accessToken
        token.refreshToken = user?.refresh_token || user?.refreshToken
      } else if (account) {
        token.accessToken = account.access_token || account.accessToken
        token.refreshToken = token?.refresh_token || token?.refreshToken
      }
      return token
    }
  }
}

export default auth
