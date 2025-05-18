'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import status from 'http-status'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ZodIssue } from 'zod'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form'
import { Icons } from '~/components/ui/icons'
import { Input } from '~/components/ui/input'
import { useSendEmailVerificationMutation } from '~/hooks/data/auth.hooks'
import { Link } from '~/i18n/navigation'
import {
  cn,
  getRememberedAccountFromCookie,
  removeRememberedAccountFromCookie,
  setRememberedAccountToCookie
} from '~/lib/utils'
import { formLoginSchema, FormLoginValues } from '~/schemas/form.schemas'

type Props = {
  className?: string
}

function FormLogin({ className }: Props) {
  const sendEmailVerificationMutation = useSendEmailVerificationMutation()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const form = useForm<FormLoginValues>({
    defaultValues: {
      email: searchParams.get('email') || '',
      password: '',
      remember: false
    },
    resolver: zodResolver(formLoginSchema)
  })
  const [loadingState, setLoadingState] = useState<{ credentials: boolean; google: boolean; github: boolean }>({
    credentials: false,
    github: false,
    google: false
  })
  const isLoading = Object.values(loadingState).some(Boolean) || isPending

  useEffect(() => {
    const credentials = getRememberedAccountFromCookie()
    if (credentials) {
      form.setValue('remember', true)
      form.setValue('email', credentials.email)
      form.setValue('password', credentials.password)
    }
  }, [form])

  // Phần xử lý đăng nhập
  const handleCredentialsLogin = form.handleSubmit(async (data) => {
    setLoadingState((prev) => ({ ...prev, credentials: true }))
    const { remember, ...credentials } = data

    const response = await signIn('credentials', {
      ...credentials,
      redirect: false
    })

    if (response?.error) {
      let errorData;
      
      try {
        errorData = JSON.parse(response.error);
      } catch (error) {
        toast.error('Đã xảy ra lỗi khi đăng nhập');
        setLoadingState((prev) => ({ ...prev, credentials: false }));
        return;
      }

      // UNPROCESSABLE_ENTITY_ERROR
      if (errorData?.status === status.UNPROCESSABLE_ENTITY) {
        const errors = errorData?.data?.errors

        if (errors && typeof errors === 'object') {
          Object.entries(errors as Record<string, ZodIssue>).forEach(([key, value]) => {
            if (typeof value === 'object' && 'message' in value && 'code' in value) {
              form.setError(key as keyof FormLoginValues, {
                type: value.code,
                message: value.message
              })
            }
          })
        }
      }

      // UNVERIFIED_ACCOUNT_ERROR
      if (errorData?.status === status.FORBIDDEN && errorData?.data?.name === 'UNVERIFIED_ACCOUNT_ERROR') {
        const response = await sendEmailVerificationMutation.mutateAsync({
          email: data.email
        })

        startTransition(() => {
          router.push(`/auth/recover/code?email=${encodeURIComponent(data.email)}&redirect_from=register`)
        })
        toast.info(errorData?.data?.message || response.data.message)
      }

      // ACCOUNT_SUSPENDED_ERROR
      if (errorData?.status === status.FORBIDDEN && errorData?.data?.name === 'ACCOUNT_SUSPENDED_ERROR') {
        toast.info(errorData?.data?.message)
      }
    } else {
      if (data.remember) {
        setRememberedAccountToCookie({
          email: data.email,
          password: data.password
        })
      } else {
        removeRememberedAccountFromCookie()
      }
      
      toast.success('Đăng nhập thành công!')
      
      startTransition(() => {
        router.replace('/')
      })
    }

    setLoadingState((prev) => ({ ...prev, credentials: false }))
  })

  async function handleGoogleLogin() {
    setLoadingState((prev) => ({ ...prev, google: true }))
    await signIn('google', {
      callbackUrl: '/'
    })
    setLoadingState((prev) => ({ ...prev, google: false }))
  }

  async function handleGithubLogin() {
    setLoadingState((prev) => ({ ...prev, github: true }))
    await signIn('github', {
      callbackUrl: '/'
    })
    setLoadingState((prev) => ({ ...prev, github: false }))
  }

  return (
    <div className={cn('mx-auto flex w-full flex-col justify-center gap-0 space-y-6', className)}>
      <div className={'grid gap-6'}>
        <Form {...form}>
          <form onSubmit={handleCredentialsLogin}>
            <div className='grid gap-4'>
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder='name@example.com' disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input id='password' type='password' disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='flex items-center justify-between'>
                <FormField
                  control={form.control}
                  name='remember'
                  render={({ field }) => (
                    <FormItem className='flex items-center'>
                      <FormControl>
                        <Checkbox
                          id='remember'
                          disabled={isLoading}
                          onCheckedChange={field.onChange}
                          checked={field.value}
                        />
                      </FormControl>
                      <FormLabel htmlFor='remember'>Remember me</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Link
                  href='/auth/forgot-password'
                  className='hover:text-primary text-muted-foreground text-sm underline underline-offset-4'
                >
                  Forgot password?
                </Link>
              </div>
              <Button disabled={isLoading}>
                {(loadingState.credentials || isPending) && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
                Login
              </Button>
            </div>
          </form>
        </Form>
        <div className='flex items-center'>
          <span className='w-full border-t' />
          <span className='text-muted-foreground px-2 text-xs text-nowrap uppercase'>Or continue with</span>
          <span className='w-full border-t' />
        </div>
        <div className='flex gap-5 px-0'>
          <Button variant='outline' onClick={handleGoogleLogin} className='flex-1/2' disabled={isLoading}>
            {loadingState.google ? (
              <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Icons.google className='mr-2 h-4 w-4' />
            )}{' '}
            Google
          </Button>
          <Button variant='outline' onClick={handleGithubLogin} className='flex-1/2' disabled={isLoading}>
            {loadingState.github ? (
              <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Icons.gitHub className='mr-2 h-4 w-4' />
            )}{' '}
            GitHub
          </Button>
        </div>
        <div className='flex items-center justify-center space-x-1'>
          <p>Don't have an account?</p>
          <Link className='underline' href={'/auth/register'}>
            Register
          </Link>
        </div>
      </div>
    </div>
  )
}

export default FormLogin
