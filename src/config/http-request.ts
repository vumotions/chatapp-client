import axios, { AxiosInstance } from 'axios'
import { getSession, signOut } from 'next-auth/react'
import { isAxiosUnauthorizedError, refreshToken } from '~/lib/utils'
import nextEnv from './next-env'

class HttpRequest {
  instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: `${nextEnv.NEXT_PUBLIC_SERVER_URL}/api`,
      timeout: 10000
    })

    this.instance.interceptors.request.use(
      async (config) => {
        if (!(config as any).usingNewAccessToken) {
          const session = await getSession({ event: 'storage' })
          const accessToken = session?.accessToken

          if (accessToken) {
            config.headers.set('Authorization', `Bearer ${accessToken}`)
          }
        }

        return config
      },
      (error) => Promise.reject(error)
    )

    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const prevRequest = error.config
        if (
          isAxiosUnauthorizedError<{ name: string; message: string }>(error) &&
          error.response?.data.name === 'ACCESS_TOKEN_EXPIRED_ERROR' &&
          !prevRequest.sent
        ) {
          prevRequest.sent = true

          const session = await getSession()

          const { accessToken } = await refreshToken(session?.refreshToken || '')
          if (accessToken) {
            prevRequest.usingNewAccessToken = true
            prevRequest.headers.Authorization = `Bearer ${accessToken}`
            return this.instance(prevRequest)
          }
        }

        if (
          isAxiosUnauthorizedError<{ name: string; message: string }>(error) &&
          error.response?.data.name === 'REFRESH_TOKEN_EXPIRED_ERROR'
        ) {
          await signOut?.()
        }
        return Promise.reject(error)
      }
    )
  }
}

const httpRequest = new HttpRequest().instance
export default httpRequest
