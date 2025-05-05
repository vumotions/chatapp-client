import { AxiosResponse } from 'axios'
import { signOut, useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import httpRequest from '~/config/http-request'
import { isAccessTokenExpiredError } from '~/lib/utils'
import { SuccessResponse } from '~/types/api.types'

function useRequest() {
  const { data: session, update } = useSession()
  const refreshTokenPromise = useRef<Promise<
    AxiosResponse<
      SuccessResponse<{
        tokens: {
          accessToken: string
          refreshToken: string
        }
      }>
    >
  > | null>(null)

  const accessToken = useRef<string>('')

  useEffect(() => {
    if (session?.accessToken) {
      accessToken.current = session.accessToken
    }
  }, [session?.accessToken])

  useEffect(() => {
    if (!accessToken.current) return
    const requestInterceptor = httpRequest.interceptors.request.use(
      async (config) => {
        if (!config.headers['Authorization']) {
          config.headers.set('Authorization', `Bearer ${accessToken.current}`)
        }

        return config
      },
      (error) => Promise.reject(error)
    )

    // #region refresh token
    const responseInterceptor = httpRequest.interceptors.response.use(
      (response) => response,
      async (error) => {
        const prevRequest = error.config
        if (isAccessTokenExpiredError(error) && !prevRequest?.sent) {
          if (!refreshTokenPromise.current) {
            prevRequest.sent = true

            try {
              refreshTokenPromise.current = httpRequest.post<
                SuccessResponse<{
                  tokens: {
                    accessToken: string
                    refreshToken: string
                  }
                }>
              >('/auth/refresh-token', {
                refreshToken: session?.refreshToken
              })

              const rtkResponse = await refreshTokenPromise.current.finally(() => {
                refreshTokenPromise.current = null
              })

              if (rtkResponse) {
                const tokens = rtkResponse.data.data.tokens
                update({
                  accessToken: tokens.accessToken,
                  refreshToken: tokens.refreshToken
                })

                accessToken.current = tokens.accessToken

                prevRequest.headers['Authorization'] = `Bearer ${tokens.accessToken}`
                return httpRequest(prevRequest)
              }
            } catch (error) {
              await signOut()
              return Promise.reject(error)
            }
          }
        }

        return Promise.reject(error)
      }
    )

    return () => {
      httpRequest.interceptors.request.eject(requestInterceptor)
      httpRequest.interceptors.request.eject(responseInterceptor)
    }
  }, [session?.accessToken])

  return httpRequest
}

export default useRequest
