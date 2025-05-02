import { useMutation } from '@tanstack/react-query'
import authService from '~/services/auth.service'

export const useRegisterMutation = () => {
  return useMutation({
    mutationFn: authService.register,
    onSuccess: (response) => {
      const { otpExpiresAt } = response.data.data
      localStorage.setItem('otpExpiresAt', otpExpiresAt)
    }
  })
}

export const useSendEmailVerificationMutation = () => {
  return useMutation({
    mutationFn: authService.sendEmailVerification,
    onSuccess: (response) => {
      const { otpExpiresAt } = response.data.data
      localStorage.setItem('otpExpiresAt', otpExpiresAt)
    }
  })
}

export const useVerifyAccountMutation = () => {
  return useMutation({
    mutationFn: authService.verifyAccount
  })
}
