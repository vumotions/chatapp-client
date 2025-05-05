import { useMutation } from '@tanstack/react-query'
import { FormCodeValues, FormRegisterValues } from '~/schemas/form.schemas'
import { RegisterResponse, SendEmailVerificationResponse, VerifyAccountResponse } from '~/types/auth.types'
import useRequest from '../use-request'

export const useRegisterMutation = () => {
  const request = useRequest()

  return useMutation({
    mutationFn: (body: FormRegisterValues) => request.post<RegisterResponse>('/auth/register', body),
    onSuccess: (response) => {
      const { otpExpiresAt } = response.data.data
      localStorage.setItem('otpExpiresAt', otpExpiresAt)
    }
  })
}

export const useSendEmailVerificationMutation = () => {
  const request = useRequest()

  return useMutation({
    mutationFn: (body: Pick<FormCodeValues, 'email'>) =>
      request.post<SendEmailVerificationResponse>('/auth/email/verify/request', body),
    onSuccess: (response) => {
      const { otpExpiresAt } = response.data.data
      localStorage.setItem('otpExpiresAt', otpExpiresAt)
    }
  })
}

export const useVerifyAccountMutation = () => {
  const request = useRequest()

  return useMutation({
    mutationFn: (body: FormCodeValues) => request.post<VerifyAccountResponse>('/auth/email/verify/confirm', body)
  })
}
