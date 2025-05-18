import { SuccessResponse } from './api.types'
import { User } from './user.types'

export type RegisterResponse = SuccessResponse<{
  user: User
  otpExpiresAt: string
}>

export type LoginResponse = SuccessResponse<{
  user: User
  tokens: {
    accessToken: string
    refreshToken: string
    accessTokenExpiresAt: number
  }
}>

export type VerifyAccountResponse = SuccessResponse<User>

export type SendEmailVerificationResponse = SuccessResponse<{
  otpExpiresAt: string
}>

export type GetMyProfileResponse = SuccessResponse<{
  _id: string
  username: string
  email: string
  avatar?: string
  coverPhoto?: string
  name: string
  verify: string
  provider?: string
  providerId?: string
  isBot: boolean
  createdBy: null
  emailLockedUntil: null
  createdAt: string
  updatedAt: string
  __v: number
}>

export type RequestResetPasswordResponse = SuccessResponse<{
  otpExpiresAt: string
}>

export type ConfirmResetPasswordResponse = SuccessResponse<null>

export type ResetPasswordResponse = SuccessResponse<null>
