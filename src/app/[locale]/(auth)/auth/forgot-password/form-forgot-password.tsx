'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import CustomFormMessage from '~/components/custom-form-message'
import { Button } from '~/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form'
import { Icons } from '~/components/ui/icons'
import { Input } from '~/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '~/components/ui/input-otp'
import {
  useConfirmResetPasswordMutation,
  useRequestResetPasswordMutation,
  useResetPasswordMutation
} from '~/hooks/data/auth.hooks'
import useCountdown from '~/hooks/use-countdown'
import { useAuthTranslation } from '~/hooks/use-translations'
import { handleError } from '~/lib/handlers'
import { cn } from '~/lib/utils'
import { formForgotPasswordBaseSchema, FormForgotPasswordValues } from '~/schemas/form.schemas'

type Props = {
  className?: string
}

enum ForgotPasswordStep {
  EMAIL,
  OTP,
  NEW_PASSWORD
}

function FormForgotPassword({ className }: Props) {
  const t = useAuthTranslation()
  const [step, setStep] = useState<ForgotPasswordStep>(ForgotPasswordStep.EMAIL)
  const [email, setEmail] = useState<string>('')
  const { isTimeout, setCountdown, time } = useCountdown()

  const requestResetPasswordMutation = useRequestResetPasswordMutation()
  const confirmResetPasswordMutation = useConfirmResetPasswordMutation()
  const resetPasswordMutation = useResetPasswordMutation()

  // Form for email step
  const emailForm = useForm<Pick<FormForgotPasswordValues, 'email'>>({
    defaultValues: {
      email: ''
    },
    resolver: zodResolver(formForgotPasswordBaseSchema.pick({ email: true }))
  })

  // Form for OTP step
  const otpForm = useForm<Pick<FormForgotPasswordValues, 'otp'>>({
    defaultValues: {
      otp: ''
    },
    resolver: zodResolver(formForgotPasswordBaseSchema.pick({ otp: true }))
  })

  // Form for new password step
  const passwordForm = useForm<Pick<FormForgotPasswordValues, 'password' | 'confirmPassword'>>({
    defaultValues: {
      password: '',
      confirmPassword: ''
    },
    resolver: zodResolver(formForgotPasswordBaseSchema.pick({ password: true, confirmPassword: true }))
  })

  // Handle email submission
  const handleEmailSubmit = emailForm.handleSubmit(async (data) => {
    try {
      const response = await requestResetPasswordMutation.mutateAsync({ email: data.email })
      const {
        message,
        data: { otpExpiresAt }
      } = response.data

      toast.success(message)
      setEmail(data.email)
      localStorage.setItem('otpExpiresAt', otpExpiresAt)
      const expiresAt = new Date(otpExpiresAt).getTime()
      setCountdown(expiresAt)
      setStep(ForgotPasswordStep.OTP)
    } catch (error) {
      handleError(error, emailForm)
    }
  })

  // Handle OTP verification
  const handleOtpSubmit = otpForm.handleSubmit(async (data) => {
    try {
      const response = await confirmResetPasswordMutation.mutateAsync({
        email,
        otp: data.otp
      })

      toast.success(response.data.message)
      setStep(ForgotPasswordStep.NEW_PASSWORD)
    } catch (error) {
      handleError(error, otpForm)
    }
  })

  // Handle password reset
  const handlePasswordSubmit = passwordForm.handleSubmit(async (data) => {
    try {
      const response = await resetPasswordMutation.mutateAsync({
        email,
        password: data.password,
        confirmPassword: data.confirmPassword
      })

      toast.success(response.data.message)
      window.location.href = `/auth/login?email=${encodeURIComponent(email)}`
    } catch (error) {
      handleError(error, passwordForm)
    }
  })

  // Handle resend code
  const handleResendCode = async () => {
    try {
      otpForm.reset()
      const response = await requestResetPasswordMutation.mutateAsync({ email })
      const {
        message,
        data: { otpExpiresAt }
      } = response.data

      toast.success(message)
      localStorage.setItem('otpExpiresAt', otpExpiresAt)
      const expiresAt = new Date(otpExpiresAt).getTime()
      setCountdown(expiresAt)
    } catch (error) {
      handleError(error, otpForm)
    }
  }

  return (
    <div className={cn('mx-auto flex w-full flex-col justify-center gap-0 space-y-6', className)}>
      <div className='grid gap-6'>
        {/* Email Step */}
        {step === ForgotPasswordStep.EMAIL && (
          <Form {...emailForm}>
            <form onSubmit={handleEmailSubmit}>
              <div className='grid gap-4'>
                <FormField
                  control={emailForm.control}
                  name='email'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('email')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('emailPlaceholder')}
                          type='email'
                          disabled={requestResetPasswordMutation.isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type='submit' disabled={requestResetPasswordMutation.isPending || !emailForm.formState.isDirty}>
                  {requestResetPasswordMutation.isPending && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
                  {t('sendResetCode')}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* OTP Step */}
        {step === ForgotPasswordStep.OTP && (
          <Form {...otpForm}>
            <form onSubmit={handleOtpSubmit}>
              <div className='grid gap-3'>
                <p className='text-center text-sm'>
                  {t('verificationCodeSentTo')} <strong>{email}</strong>
                </p>
                <FormField
                  control={otpForm.control}
                  name='otp'
                  render={({ field }) => (
                    <FormItem className='mt-3 flex flex-col items-center justify-center gap-1'>
                      <FormControl>
                        <InputOTP
                          maxLength={6}
                          {...field}
                          onInput={(e) => {
                            const value = e.currentTarget.value

                            if (!/^\d*$/.test(value)) {
                              otpForm.setError('otp', {
                                message: t('onlyNumbersAllowed')
                              })
                              e.currentTarget.value = value.replace(/\D/g, '')
                            } else {
                              otpForm.clearErrors('otp')
                            }
                          }}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </FormControl>
                      <CustomFormMessage message={otpForm.formState.errors.otp?.message} />
                    </FormItem>
                  )}
                />
                <div className='grid grid-cols-2 gap-3'>
                  <Button type='button' variant='outline' onClick={() => setStep(ForgotPasswordStep.EMAIL)}>
                    {t('back')}
                  </Button>
                  <Button type='submit' disabled={confirmResetPasswordMutation.isPending || !otpForm.formState.isDirty}>
                    {confirmResetPasswordMutation.isPending && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
                    {t('verifyCode')}
                  </Button>
                </div>

                <Button
                  type='button'
                  variant={'link'}
                  onClick={handleResendCode}
                  disabled={!isTimeout || requestResetPasswordMutation.isPending}
                >
                  {t('sendCodeAgain')}{' '}
                  {requestResetPasswordMutation.isPending && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
                </Button>
                {!isTimeout && (
                  <div className='flex items-center justify-center'>
                    <span className='bg-secondary flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-base font-bold shadow-xs'>
                      {time}s
                    </span>
                  </div>
                )}
              </div>
            </form>
          </Form>
        )}

        {/* New Password Step */}
        {step === ForgotPasswordStep.NEW_PASSWORD && (
          <Form {...passwordForm}>
            <form onSubmit={handlePasswordSubmit}>
              <div className='grid gap-4'>
                <FormField
                  control={passwordForm.control}
                  name='password'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('newPassword')}</FormLabel>
                      <FormControl>
                        <Input type='password' disabled={resetPasswordMutation.isPending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name='confirmPassword'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('confirmPassword')}</FormLabel>
                      <FormControl>
                        <Input type='password' disabled={resetPasswordMutation.isPending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className='grid grid-cols-2 gap-3'>
                  <Button type='button' variant='outline' onClick={() => setStep(ForgotPasswordStep.OTP)}>
                    {t('back')}
                  </Button>
                  <Button type='submit' disabled={resetPasswordMutation.isPending || !passwordForm.formState.isDirty}>
                    {resetPasswordMutation.isPending && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
                    {t('resetPassword')}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        )}
      </div>
    </div>
  )
}

export default FormForgotPassword


