'use client'

import { cn } from '~/lib/utils'

import { zodResolver } from '@hookform/resolvers/zod'
import { redirect, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import CustomFormMessage from '~/components/custom-form-message'
import { Button, buttonVariants } from '~/components/ui/button'
import { Form, FormControl, FormField, FormItem } from '~/components/ui/form'
import { Icons } from '~/components/ui/icons'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '~/components/ui/input-otp'
import { useSendEmailVerificationMutation, useVerifyAccountMutation } from '~/hooks/data/auth.hooks'
import useCountdown from '~/hooks/use-countdown'
import { Link, useRouter } from '~/i18n/navigation'
import { handleError } from '~/lib/handlers'
import { formCodeSchema, FormCodeValues } from '~/schemas/form.schemas'

type Props = {
  className?: string
}

function FormCode({ className }: Props) {
  const form = useForm<Pick<FormCodeValues, 'otp'>>({
    defaultValues: {
      otp: ''
    },
    resolver: zodResolver(formCodeSchema.pick({ otp: true }))
  })
  const router = useRouter()
  const { isTimeout, setCountdown, time } = useCountdown()
  const verifyAccountMutation = useVerifyAccountMutation()
  const sendEmailVerificationMutation = useSendEmailVerificationMutation()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  // Validate email (weak now)
  if (!email) {
    return redirect('/auth/register')
  }

  useEffect(() => {
    const otpExpiresAt = localStorage.getItem('otpExpiresAt')
    if (otpExpiresAt) {
      const expiresAt = new Date(otpExpiresAt).getTime()
      setCountdown(expiresAt)
    }
  }, [])

  const handleAccountVerification = form.handleSubmit(async (data) => {
    try {
      const response = await verifyAccountMutation.mutateAsync({
        email,
        otp: data.otp
      })
      toast.success(response.data.message)
      router.replace(`/auth/login?email=${encodeURIComponent(email)}&redirect_from=register`)
    } catch (error) {
      handleError(error, form)
    }
  })

  const handleResendCode = async () => {
    try {
      form.reset()
      const response = await sendEmailVerificationMutation.mutateAsync({ email })
      const {
        message,
        data: { otpExpiresAt }
      } = response.data

      toast.success(message)
      localStorage.setItem('otpExpiresAt', otpExpiresAt)
      const expiresAt = new Date(otpExpiresAt).getTime()
      setCountdown(expiresAt)
    } catch (error) {
      handleError(error, form)
    }
  }

  return (
    <>
      <div className='flex flex-col space-y-2 text-center'>
        <h1 className='text-2xl font-semibold tracking-tight'>Enter the code from your email</h1>
        <p className='space-x-1 text-sm'>
          <span className='text-muted-foreground'>
            Let us know that this email address belongs to you. Enter the code from the email sent to
          </span>
          <strong className='underline'>{email}</strong>.
        </p>
      </div>
      <div className={cn('mx-auto flex w-full flex-col justify-center gap-0 space-y-6', className)}>
        <div className={'grid gap-6'}>
          <Form {...form}>
            <form onSubmit={handleAccountVerification}>
              <div className='grid gap-3'>
                <FormField
                  control={form.control}
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
                              form.setError('otp', {
                                message: 'Only numbers are allowed'
                              })
                              e.currentTarget.value = value.replace(/\D/g, '')
                            } else {
                              form.clearErrors('otp')
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
                      <CustomFormMessage message={form.formState.errors.otp?.message} />
                    </FormItem>
                  )}
                />
                <div className='mx-auto grid w-full max-w-[216px] grid-cols-2 items-center justify-center space-x-3'>
                  <Link
                    href={'/auth/login'}
                    className={cn(
                      buttonVariants({
                        variant: 'outline'
                      })
                    )}
                  >
                    Cancel
                  </Link>
                  <Button
                    onClick={handleAccountVerification}
                    disabled={verifyAccountMutation.isPending || !form.formState.isDirty}
                  >
                    {verifyAccountMutation.isPending && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
                    Continue
                  </Button>
                </div>

                <Button
                  type='button'
                  variant={'link'}
                  onClick={handleResendCode}
                  disabled={!isTimeout || sendEmailVerificationMutation.isPending}
                >
                  Send Email Again{' '}
                  {sendEmailVerificationMutation.isPending && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
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
        </div>
      </div>
    </>
  )
}

export default FormCode
