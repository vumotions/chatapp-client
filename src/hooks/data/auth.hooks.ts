import { useMutation, useQuery } from '@tanstack/react-query'
import authService from '~/services/auth.service'
import { FormCodeValues, FormRegisterValues } from '~/schemas/form.schemas'

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
