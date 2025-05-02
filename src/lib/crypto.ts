import CryptoJS from 'crypto-js'
import nextEnv from '~/config/next-env'

export const encrypt = (value: string) => {
  return CryptoJS.AES.encrypt(value, nextEnv.NEXT_PUBLIC_HASH_SECRET).toString()
}

export const decrypt = (value: string) => {
  const bytes = CryptoJS.AES.decrypt(value, nextEnv.NEXT_PUBLIC_HASH_SECRET)
  return bytes.toString(CryptoJS.enc.Utf8)
}
