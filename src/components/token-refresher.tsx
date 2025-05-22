'use client'

import { signOut, useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import { refreshToken } from '~/lib/utils'

const TokenRefresher = () => {
  const { data: session, update } = useSession()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!session?.accessToken || !session?.accessTokenExpiresAt) return

    const refreshInterval = 60 * 1000 // Kiểm tra mỗi phút
    const threshold = 300 // 5 phút trước khi hết hạn

    const checkTokenExpiry = async () => {
      const currentTime = Math.floor(Date.now() / 1000)
      const expiresAt = session.accessTokenExpiresAt as number

      if (expiresAt - currentTime <= threshold) {
        try {
          const {
            accessToken,
            refreshToken: newRefreshToken,
            accessTokenExpiresAt
          } = await refreshToken(session)

          if (accessToken) {
            await update({
              accessToken,
              refreshToken: newRefreshToken,
              accessTokenExpiresAt
            })
          } else {
            // Nếu không nhận được token mới, đăng xuất
            signOut({ redirect: true, callbackUrl: '/auth/login' })
          }
        } catch (err) {
          console.error('Error refreshing token:', err)
          signOut({ redirect: true, callbackUrl: '/auth/login' })
        }
      }
    }

    // Kiểm tra ngay khi component mount
    checkTokenExpiry()

    // Thiết lập interval để kiểm tra định kỳ
    intervalRef.current = setInterval(checkTokenExpiry, refreshInterval)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [session, update])

  return null
}

export default TokenRefresher
