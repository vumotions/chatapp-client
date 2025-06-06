import axios, { AxiosInstance } from 'axios'
import { getSession, signOut } from 'next-auth/react'
import { isAxiosUnauthorizedError, refreshToken } from '~/lib/utils'
import nextEnv from './next-env'

class HttpRequest {
  instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: `${nextEnv.NEXT_PUBLIC_SERVER_URL}/api`,
      timeout: 60000, // Tăng lên 60 giây
      maxContentLength: 100 * 1024 * 1024, // Cho phép upload file lớn (100MB)
      maxBodyLength: 100 * 1024 * 1024
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

          try {
            const session = await getSession()

            const { accessToken } = await refreshToken(session?.refreshToken || '')

            if (accessToken) {
              prevRequest.usingNewAccessToken = true
              prevRequest.headers.Authorization = `Bearer ${accessToken}`
              return this.instance(prevRequest)
            } else {
              await signOut({
                redirect: true,
                callbackUrl: '/auth/login'
              })

              return Promise.reject(new Error('Failed to refresh access token'))
            }
          } catch (error: any) {
            await signOut({
              redirect: true,
              callbackUrl: '/auth/login'
            })
            // if (
            //   isAxiosUnauthorizedError<{ name: string; message: string }>(error) &&
            //   error.response?.data.name === 'REFRESH_TOKEN_EXPIRED_ERROR'
            // ) {

            // } else {
            //   console.error('Other error during refresh, signing out')
            // }

            return Promise.reject(new Error('Authentication failed, please login again'))
          }
        }

        return Promise.reject(error)
      }
    )
  }
}

const httpRequest = new HttpRequest().instance
export default httpRequest
