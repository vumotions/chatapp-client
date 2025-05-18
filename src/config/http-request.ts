import axios, { AxiosInstance } from 'axios'
import { getSession, signOut } from 'next-auth/react'
import nextEnv from './next-env'

class HttpRequest {
  instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: `${nextEnv.NEXT_PUBLIC_SERVER_URL}/api`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.instance.interceptors.request.use(
      async (config) => {
        try {
          const session = await getSession()
          if (session?.accessToken) {
            config.headers.Authorization = `Bearer ${session.accessToken}`
          }
          return config
        } catch (error) {
          console.error('Error getting session:', error)
          return config
        }
      },
      (error) => Promise.reject(error)
    )

    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (!error.config) {
          return Promise.reject(error)
        }

        const prevRequest = error.config
        
        // Nếu lỗi là ACCESS_TOKEN_EXPIRED_ERROR và chưa thử refresh token
        if (
          error.response?.status === 401 && 
          error.response?.data?.name === 'ACCESS_TOKEN_EXPIRED_ERROR' && 
          !prevRequest._retry
        ) {
          prevRequest._retry = true
          
          try {
            // Lấy session hiện tại
            const session = await getSession()
            
            if (!session?.refreshToken) {
              // Nếu không có refresh token, đăng xuất
              await signOut({ redirect: true, callbackUrl: '/auth/login' })
              return Promise.reject(error)
            }
            
            // Gọi API refresh token
            const response = await axios.post(
              `${nextEnv.NEXT_PUBLIC_SERVER_URL}/api/auth/refresh-token`,
              { refreshToken: session.refreshToken }
            )
            
            const { accessToken } = response.data.data.tokens
            
            // Cập nhật token trong request và thử lại
            prevRequest.headers.Authorization = `Bearer ${accessToken}`
            
            return this.instance(prevRequest)
          } catch (refreshError) {
            console.error('Error refreshing token:', refreshError)
            // Nếu refresh token thất bại, đăng xuất
            await signOut({ redirect: true, callbackUrl: '/auth/login' })
            return Promise.reject(error)
          }
        }
        
        // Nếu lỗi là REFRESH_TOKEN_EXPIRED_ERROR, đăng xuất
        if (
          error.response?.status === 401 && 
          error.response?.data?.name === 'REFRESH_TOKEN_EXPIRED_ERROR'
        ) {
          await signOut({ redirect: true, callbackUrl: '/auth/login' })
        }
        
        return Promise.reject(error)
      }
    )
  }

  get(url: string, config?: any) {
    return this.instance.get(url, config)
  }

  post(url: string, data?: any, config?: any) {
    return this.instance.post(url, data, config)
  }

  put(url: string, data?: any, config?: any) {
    return this.instance.put(url, data, config)
  }

  delete(url: string, config?: any) {
    return this.instance.delete(url, config)
  }
}

const httpRequest = new HttpRequest()
export default httpRequest
