import { useMutation, useQuery } from '@tanstack/react-query'
import httpRequest from '~/config/http-request'
import { FormCodeValues, FormForgotPasswordValues, FormRegisterValues } from '~/schemas/form.schemas'
import authService from '~/services/auth.service'
import {
  ConfirmResetPasswordResponse,
  GetMyProfileResponse,
  RegisterResponse,
  RequestResetPasswordResponse,
  ResetPasswordResponse,
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

export const useRequestResetPasswordMutation = () => {
  return useMutation({
    mutationFn: (body: Pick<FormForgotPasswordValues, 'email'>) =>
      httpRequest.post<RequestResetPasswordResponse>('/auth/request-reset-password', body),
    onSuccess: (response) => {
      const { otpExpiresAt } = response.data.data
      localStorage.setItem('otpExpiresAt', otpExpiresAt)
    }
  })
}

export const useConfirmResetPasswordMutation = () => {
  return useMutation({
    mutationFn: (body: Pick<FormForgotPasswordValues, 'email' | 'otp'>) =>
      httpRequest.post<ConfirmResetPasswordResponse>('/auth/confirm-reset-password', body)
  })
}

export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: (body: Pick<FormForgotPasswordValues, 'email' | 'password' | 'confirmPassword'>) =>
      httpRequest.patch<ResetPasswordResponse>('/auth/reset-password', body)
  })
}
