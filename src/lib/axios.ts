import axios from 'axios'
import { getSession } from 'next-auth/react'
import nextEnv from '~/config/next-env'

// Tạo instance axios
export const axiosInstance = axios.create({
  baseURL: `${nextEnv.NEXT_PUBLIC_SERVER_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Thêm interceptor để tự động thêm token vào header
axiosInstance.interceptors.request.use(
  async (config) => {
    const session = await getSession()
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Thêm interceptor để xử lý response
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
)