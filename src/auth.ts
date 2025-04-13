import { AuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import nextEnv from './config/env'

const auth: AuthOptions = {
  providers: [
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
      console.log({ session })

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
        // Credential sign in
        token.accessToken = user.access_token || user.accessToken
      } else if (account) {
        // SSO signin
        token.accessToken = account.access_token || account.accessToken
      }
      console.log({ token })
      return token
    }
  }
}

export default auth
