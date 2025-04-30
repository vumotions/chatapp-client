'use client'

import { cn } from '~/lib/utils'

import { zodResolver } from '@hookform/resolvers/zod'
import { redirect, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button, buttonVariants } from '~/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from '~/components/ui/form'
import { Icons } from '~/components/ui/icons'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '~/components/ui/input-otp'
import { Link, useRouter } from '~/i18n/navigation'
import { formCodeSchema, FormCodeValues } from '~/schemas/form.schemas'
import useCountdown from '~/hooks/use-countdown'

type Props = {
  className?: string
}

function FormCode({ className }: Props) {
  const form = useForm<FormCodeValues>({
    defaultValues: {
      otp: ''
    },
    resolver: zodResolver(formCodeSchema)
  })
  const router = useRouter()
  const { isTimeout, setCountdown, time } = useCountdown(Date.now() + 60 * 1000)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  if (!email) {
    return redirect('/auth/register')
  }

  const handleAccountVerification = form.handleSubmit(async (data) => {
    setIsLoading(true)

    try {
      toast.success('Account verified successfully')
      router.replace(`/auth/login?email=${encodeURIComponent(email)}&redirect_from=register`)
    } catch (error) {
      toast.error('Account verification failed')
    } finally {
      setIsLoading(false)
    }
  })

  const handleResendCode = async () => {
    form.reset()
    try {
      toast.success('Code resent successfully')
      setCountdown(Date.now() + 5 * 1000) // fake 5s
    } catch (error) {
      toast.error('Code resent failed')
    }
  }

  return (
    <div className={cn('mx-auto flex w-full flex-col justify-center gap-0 space-y-6', className)}>
      <div className={'grid gap-6'}>
        <Form {...form}>
          <form onSubmit={handleAccountVerification}>
            <div className='grid gap-4'>
              <FormField
                control={form.control}
                name='otp'
                render={({ field }) => (
                  <FormItem className='flex flex-col items-center justify-center'>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='flex items-center justify-center space-x-3'>
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
                <Button disabled={isLoading || !form.formState.isDirty}>
                  {isLoading && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
                  Continue
                </Button>
              </div>

              <Button type='button' variant={'link'} onClick={handleResendCode} disabled={!isTimeout}>
                Send Email Again
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
  )
}

export default FormCode
