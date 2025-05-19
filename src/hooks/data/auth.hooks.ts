import { useMutation, useQuery } from '@tanstack/react-query'
import httpRequest from '~/config/http-request'
import { FormCodeValues, FormForgotPasswordValues, FormRegisterValues } from '~/schemas/form.schemas'
import authService from '~/services/auth.service'
import {
  ConfirmResetPasswordResponse,
  RequestResetPasswordResponse,
  ResetPasswordResponse
} from '~/types/auth.types'

export const useRegisterMutation = () => {
  return useMutation({
    mutationFn: (body: FormRegisterValues) => authService.register(body),
    onSuccess: (response) => {
      const { otpExpiresAt } = response.data.data
      localStorage.setItem('otpExpiresAt', otpExpiresAt)
    }
  })
}

export const useSendEmailVerificationMutation = () => {
  return useMutation({
    mutationFn: (body: Pick<FormCodeValues, 'email'>) => authService.sendEmailVerification(body)
  })
}

export const useVerifyAccountMutation = () => {
  return useMutation({
    mutationFn: (body: FormCodeValues) => authService.verifyAccount(body)
  })
}

export const useGetMyProfileQuery = () => {
  return useQuery({
    queryKey: ['my-profile'],
    queryFn: () => authService.getMyProfile()
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
