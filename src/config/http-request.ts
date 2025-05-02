import axios, { AxiosInstance } from 'axios'
import { getServerSession } from 'next-auth'
import { getSession } from 'next-auth/react'
import nextEnv from './next-env'
import { isAxiosUnauthorizedError } from '~/lib/utils'

class HttpRequest {
  instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: `${nextEnv.NEXT_PUBLIC_SERVER_URL}/api`,
      timeout: 10000
    })

    this.instance.interceptors.request.use(
      async (config) => {
        let session = null
        if (typeof window !== 'undefined') {
          session = await getSession()
        } else {
          session = await getServerSession()
        }

        const accessToken = session?.accessToken

        if (accessToken) {
          config.headers.set('Authorization', `Bearer ${accessToken}`)
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (
          isAxiosUnauthorizedError<{ name: string; message: string }>(error) &&
          error.response?.data.name === 'ACCESS_TOKEN_EXPIRED_ERROR'
        ) {
          let session = null
          if (typeof window !== 'undefined') {
            session = await getSession()
          } else {
            session = await getServerSession()
          }

          const refreshToken = session?.refreshToken

          const refreshTokenResponse = await this.instance.post('/', {
            refreshToken
          })
        }
        return Promise.reject(error)
      }
    )
  }
}

const httpRequest = new HttpRequest().instance
export default httpRequest
