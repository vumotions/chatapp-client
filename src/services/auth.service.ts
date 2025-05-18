import httpRequest from '~/config/http-request'
import { FormCodeValues, FormLoginValues, FormRegisterValues, FormForgotPasswordValues } from '~/schemas/form.schemas'
import {
  GetMyProfileResponse,
  LoginResponse,
  RegisterResponse,
  SendEmailVerificationResponse,
  VerifyAccountResponse,
  RequestResetPasswordResponse,
  ConfirmResetPasswordResponse,
  ResetPasswordResponse
} from '~/types/auth.types'

class AuthService {
  async register(body: FormRegisterValues) {
    return httpRequest.post<RegisterResponse>('/auth/register', body)
  }

  async login(body: Omit<FormLoginValues, 'remember'>) {
    return httpRequest.post<LoginResponse>('/auth/login', body)
  }

  async loginOauth() {}

  async logout(refreshToken: string) {
    return httpRequest.post('/auth/logout', {
      refreshToken
    })
  }

  async sendEmailVerification(body: Pick<FormCodeValues, 'email'>) {
    return httpRequest.post<SendEmailVerificationResponse>('/auth/email/verify/request', body)
  }

  async verifyAccount(body: FormCodeValues) {
    return httpRequest.post<VerifyAccountResponse>('/auth/email/verify/confirm', body)
  }

  async getMyProfile() {
    return httpRequest.get<GetMyProfileResponse>('/user/my-profile')
  }

  async requestResetPassword(body: Pick<FormForgotPasswordValues, 'email'>) {
    return httpRequest.post<RequestResetPasswordResponse>('/auth/request-reset-password', body)
  }

  async confirmResetPassword(body: Pick<FormForgotPasswordValues, 'email' | 'otp'>) {
    return httpRequest.post<ConfirmResetPasswordResponse>('/auth/confirm-reset-password', body)
  }

  async resetPassword(body: Pick<FormForgotPasswordValues, 'email' | 'password' | 'confirmPassword'>) {
    return httpRequest.patch<ResetPasswordResponse>('/auth/reset-password', body)
  }
}

const authService = new AuthService()
export default authService
