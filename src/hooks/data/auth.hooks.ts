import { useMutation, useQuery } from '@tanstack/react-query'
import httpRequest from '~/config/http-request'
import { FormCodeValues, FormRegisterValues } from '~/schemas/form.schemas'
import authService from '~/services/auth.service'
import {
  GetMyProfileResponse,
  RegisterResponse,
  SendEmailVerificationResponse,
  VerifyAccountResponse
} from '~/types/auth.types'

export const useRegisterMutation = () => {
  return useMutation({
    mutationFn: (body: FormRegisterValues) => httpRequest.post<RegisterResponse>('/auth/register', body),
    onSuccess: (response) => {
      const { otpExpiresAt } = response.data.data
      localStorage.setItem('otpExpiresAt', otpExpiresAt)
    }
  })
}

export const useSendEmailVerificationMutation = () => {
  return useMutation({
    mutationFn: (body: Pick<FormCodeValues, 'email'>) =>
      httpRequest.post<SendEmailVerificationResponse>('/auth/email/verify/request', body),
    onSuccess: (response) => {
      const { otpExpiresAt } = response.data.data
      localStorage.setItem('otpExpiresAt', otpExpiresAt)
    }
  })
}

export const useVerifyAccountMutation = () => {
  return useMutation({
    mutationFn: (body: FormCodeValues) => httpRequest.post<VerifyAccountResponse>('/auth/email/verify/confirm', body)
  })
}

export const useMyProfileQuery = () => {
  return useQuery({
    queryKey: ['myProfile'],
    queryFn: () => authService.getMyProfile(),
    select: (response) => response.data.data
  })
}
