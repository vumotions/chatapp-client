import { USER_VERIFY_STATUS } from '~/constants/enums'

export type User = {
  username: string
  email: string
  name: string
  dateOfBirth: string
  verify: USER_VERIFY_STATUS
  isBot: boolean
  avatar?: string
  createdBy: null
  emailLockedUntil: null
  _id: string
  createdAt: string
  updatedAt: string
  __v: number
}

export type RememberedAccount = {
  email: string
  password: string
}
