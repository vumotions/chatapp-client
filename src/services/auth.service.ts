import httpRequest from '~/config/http-request'
import { 
  GetMyProfileResponse, 
  LoginResponse, 
  RegisterResponse, 
  SendEmailVerificationResponse, 
  VerifyAccountResponse 
} from '~/types/auth.types'
import { FormCodeValues, FormLoginValues, FormRegisterValues } from '~/schemas/form.schemas'

class AuthService {
  async register(body: FormRegisterValues) {
    return httpRequest.post('/auth/register', body)
  }

  async login(body: Omit<FormLoginValues, 'remember'>) {
    return httpRequest.post('/auth/login', body)
  }

  async loginOauth(data: { 
    provider: string; 
    providerId: string; 
    accessToken: string;
  }) {
    return httpRequest.post('/auth/oauth-login', data)
  }

  async loginWithGoogle(data: { accessToken: string }) {
    return httpRequest.post('/auth/oauth-login', {
      provider: 'google',
      accessToken: data.accessToken
    })
  }

  async logout(refreshToken: string) {
    return httpRequest.post('/auth/logout', {
      refreshToken
    })
  }

  async sendEmailVerification(body: Pick<FormCodeValues, 'email'>) {
    return httpRequest.post('/auth/email/verify/request', body)
  }

  async verifyAccount(body: FormCodeValues) {
    return httpRequest.post('/auth/email/verify/confirm', body)
  }

  async getMyProfile() {
    return httpRequest.get('/user/my-profile')
  }
}

const authService = new AuthService()
export default authService
