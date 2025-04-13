'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button, buttonVariants } from '~/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form'
import { Icons } from '~/components/ui/icons'
import { Input } from '~/components/ui/input'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Link, useRouter } from '~/i18n/navigation'
import { cn } from '~/lib/utils'
import { formRegisterSchema, FormRegisterValues } from '~/schemas/form.schemas'

type Props = {
  className?: string
}

function FormRegister({ className }: Props) {
  const router = useRouter()
  const form = useForm<FormRegisterValues>({
    defaultValues: {
      name: '',
      email: '',
      date: '',
      month: '',
      year: '',
      gender: 'female',
      password: '',
      confirmPassword: ''
    },
    resolver: zodResolver(formRegisterSchema)
  })
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const handleAccountRegistration = form.handleSubmit((data) => {
    toast.message('You submitted the following values:', {
      description: (
        <pre className='mt-2 w-[340px] rounded-md bg-slate-950 p-4'>
          <code className='text-white'>{JSON.stringify(data, null, 2)}</code>
        </pre>
      )
    })

    const email = data.email
    if (email) {
      router.push(`/auth/recover/code?email=${encodeURIComponent(email)}&redirect_from=register`)
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
          <form onSubmit={handleAccountRegistration}>
            <div className='grid gap-4'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder='Vu Motions' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <div className='space-y-1.5'>
                <FormLabel>Date of birth</FormLabel>
                <div className='grid grid-cols-3 gap-3'>
                  {/* Date */}
                  <FormField
                    control={form.control}
                    name='date'
                    render={({ field }) => (
                      <FormItem className='w-full'>
                        <div className='relative w-full'>
                          <FormControl>
                            <Select
                              {...field}
                              onValueChange={(value) => {
                                field.onChange(value)
                                form.trigger('dob')
                              }}
                            >
                              <SelectTrigger className='w-full font-normal'>
                                <SelectValue placeholder='Date' />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {[...Array(31)].map((_, i) => (
                                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                                      {i + 1}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <ChevronDown className='absolute top-2.5 right-3 h-4 w-4 opacity-50' />
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Month */}
                  <FormField
                    control={form.control}
                    name='month'
                    render={({ field }) => (
                      <FormItem>
                        <div className='relative w-full'>
                          <FormControl>
                            <Select
                              {...field}
                              onValueChange={(value) => {
                                field.onChange(value)
                                form.trigger('dob')
                              }}
                            >
                              <SelectTrigger className='w-full truncate font-normal'>
                                <SelectValue placeholder='Month' />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {[
                                    'Jan',
                                    'Feb',
                                    'Mar',
                                    'Apr',
                                    'May',
                                    'Jun',
                                    'Jul',
                                    'Aug',
                                    'Sep',
                                    'Oct',
                                    'Nov',
                                    'Dec'
                                  ].map((month) => (
                                    <SelectItem value={month} key={month}>
                                      {month}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <ChevronDown className='absolute top-2.5 right-3 h-4 w-4 opacity-50' />
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Year */}
                  <FormField
                    control={form.control}
                    name='year'
                    render={({ field }) => (
                      <FormItem>
                        <div className='relative w-full'>
                          <FormControl>
                            <Select
                              {...field}
                              onValueChange={(value) => {
                                field.onChange(value)
                                form.trigger('dob')
                              }}
                            >
                              <SelectTrigger className='w-full font-normal'>
                                <SelectValue placeholder='Year' />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                                    <SelectItem value={year.toString()} key={year}>
                                      {year}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <ChevronDown className='absolute top-2.5 right-3 h-4 w-4 opacity-50' />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Hiển thị lỗi DOB */}
                {form.formState.errors.dob?.message && (
                  <span className='text-destructive text-sm'>{form.formState.errors.dob.message}</span>
                )}
              </div>

              <FormField
                control={form.control}
                name='gender'
                render={({ field }) => (
                  <FormItem className='gap-0 space-y-1.5'>
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className='grid grid-cols-2'
                      >
                        <FormItem className='flex items-center space-y-0 space-x-1'>
                          <FormLabel
                            className={cn(
                              buttonVariants({
                                variant: 'outline'
                              }),
                              'w-full justify-around font-normal'
                            )}
                          >
                            Male
                            <FormControl>
                              <RadioGroupItem value='male' />
                            </FormControl>
                          </FormLabel>
                        </FormItem>
                        <FormItem className='flex items-center space-y-0 space-x-1'>
                          <FormLabel
                            className={cn(
                              buttonVariants({
                                variant: 'outline'
                              }),
                              'w-full justify-around font-normal'
                            )}
                          >
                            Female
                            <FormControl>
                              <RadioGroupItem value='female' />
                            </FormControl>
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
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
              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input id='confirmPassword' type='password' disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button disabled={isLoading}>
                {isLoading && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
                Create account
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
          <p>Already have an account?</p>
          <Link className='underline' href={'/auth/login'}>
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default FormRegister
