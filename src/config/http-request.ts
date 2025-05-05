import axios from 'axios'
import nextEnv from './next-env'

const httpRequest = axios.create({
  baseURL: `${nextEnv.NEXT_PUBLIC_SERVER_URL}/api`,
  timeout: 10000
})

export default httpRequest
