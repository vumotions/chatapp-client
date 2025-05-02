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
  }
}>

export type VerifyAccountResponse = SuccessResponse<User>

export type SendEmailVerificationResponse = SuccessResponse<{
  otpExpiresAt: string
}>
