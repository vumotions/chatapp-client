'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form'
import { Icons } from '~/components/ui/icons'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Link } from '~/i18n/navigation'
import { cn } from '~/lib/utils'
import { formLoginSchema, FormLoginValues } from '~/schemas/form.schemas'

type Props = {
  className?: string
}

function FormLogin({ className }: Props) {
  const searchParams = useSearchParams()
  const form = useForm<FormLoginValues>({
    defaultValues: {
      email: searchParams.get('email') || '',
      password: '',
      remember: false
    },
    resolver: zodResolver(formLoginSchema)
  })
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const handleCredentialsLogin = form.handleSubmit(async (data) => {
    try {
      console.log({ data })
    } catch (error) {
      // Handle error here
    }
  })

  async function handleGoogleLogin() {
    setIsLoading(true)
    await signIn('google')
    setIsLoading(false)
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
                      <Input placeholder='name@example.com' disabled={isLoading} type='email' {...field} />
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
                {isLoading && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
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
            {isLoading ? (
              <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Icons.google className='mr-2 h-4 w-4' />
            )}{' '}
            Google
          </Button>
          <Button variant='outline' className='flex-1/2' disabled={isLoading}>
            {isLoading ? (
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
