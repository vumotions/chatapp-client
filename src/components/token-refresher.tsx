'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import { refreshToken } from '~/lib/utils'

const TokenRefresher = () => {
  const { data: session, update } = useSession()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!session?.accessToken || !session?.accessTokenExpiresAt) return

    const refreshInterval = 60 * 1000
    const threshold = 300 // giây, tức là 5 phút

    const checkTokenExpiry = async () => {
      const currentTime = Math.floor(Date.now() / 1000)
      const expiresAt = session.accessTokenExpiresAt as number

      if (expiresAt - currentTime <= threshold) {
        try {
          const {
            accessToken,
            refreshToken: newRefreshToken,
            accessTokenExpiresAt
          } = await refreshToken(session.refreshToken as string)

          await update({
            accessToken,
            refreshToken: newRefreshToken,
            accessTokenExpiresAt
          })
        } catch (err) {
          console.error('Error refreshing token:', err)
          signOut()
        }
      }
    }

    intervalRef.current = setInterval(checkTokenExpiry, refreshInterval)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [session, update])

  return null
}

export default TokenRefresher
