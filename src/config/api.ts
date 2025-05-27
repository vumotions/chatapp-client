// Tạo file api.ts nếu bạn muốn sử dụng nó thay vì http-request
import axios from 'axios'
import { getSession } from 'next-auth/react'
import nextEnv from './next-env'

const api = axios.create({
  baseURL: `${nextEnv.NEXT_PUBLIC_SERVER_URL}/api`,
  timeout: 10000
})

api.interceptors.request.use(
  async (config) => {
    const session = await getSession()
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

export default api
