import httpRequest from '~/config/http-request'
import { FormCodeValues, FormLoginValues, FormRegisterValues } from '~/schemas/form.schemas'
import {
  LoginResponse,
  RegisterResponse,
  SendEmailVerificationResponse,
  VerifyAccountResponse
} from '~/types/auth.types'

class AuthService {
  async register(body: FormRegisterValues) {
    return httpRequest.post<RegisterResponse>('/auth/register', body)
  }

  async login(body: Omit<FormLoginValues, 'remember'>) {
    return httpRequest.post<LoginResponse>('/auth/login', body)
  }

  async sendEmailVerification(body: Pick<FormCodeValues, 'email'>) {
    return httpRequest.post<SendEmailVerificationResponse>('/auth/email/verify/request', body)
  }

  async verifyAccount(body: FormCodeValues) {
    return httpRequest.post<VerifyAccountResponse>('/auth/email/verify/confirm', body)
  }
}

const authService = new AuthService()
export default authService
