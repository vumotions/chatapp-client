'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Check, ChevronsUpDown, Eye, EyeOff, Loader, Moon, Send, Sun } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { cn } from '~/lib/utils'

import { useLocale } from 'next-intl'
import { useParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import CustomFormMessage from '~/components/custom-form-message'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '~/components/ui/command'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form'
import { Icons } from '~/components/ui/icons'
import { Input } from '~/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '~/components/ui/input-otp'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { Separator } from '~/components/ui/separator'
import { USER_VERIFY_STATUS } from '~/constants/enums'
import {
  useConfirmResetPasswordMutation,
  useRequestResetPasswordMutation,
  useResetPasswordMutation
} from '~/hooks/data/auth.hooks'
import { useUpdateSettingsMutation, useUserSettings } from '~/hooks/data/user.hooks'
import useCountdown from '~/hooks/use-countdown'
import { useCommonTranslation, useSettingsTranslation } from '~/hooks/use-translations'
import { usePathname, useRouter } from '~/i18n/navigation'
import { handleError } from '~/lib/handlers'
import AccountSkeleton from './account-skeleton'

const languages = [
  { label: 'Vietnamese', value: 'vi' },
  { label: 'English', value: 'en' }
] as const

// Create a function that returns the schema with translations
function getAccountFormSchema(t: (key: string) => string) {
  return z
    .object({
      newPassword: z
        .string()
        .min(6, {
          message: t('account.passwordMinLength')
        })
        .optional()
        .or(z.literal('')),
      confirmPassword: z.string().optional().or(z.literal('')),
      language: z.string({
        required_error: t('account.selectLanguage')
      }),
      theme: z.enum(['light', 'dark', 'system'], {
        required_error: t('account.selectTheme')
      }),
      otp: z
        .string()
        .regex(/^\d{6}$/, { message: t('account.otpFormat') })
        .optional()
        .or(z.literal(''))
    })
    .refine(
      (data) => {
        if (data.newPassword && data.confirmPassword && data.newPassword !== data.confirmPassword) {
          return false
        }
        return true
      },
      {
        message: t('account.passwordsDontMatch'),
        path: ['confirmPassword']
      }
    )
    .refine(
      (data) => {
        // Nếu đã nhập một trong hai trường mật khẩu, thì cả hai đều phải được nhập
        if ((data.newPassword && !data.confirmPassword) || (!data.newPassword && data.confirmPassword)) {
          return false
        }
        return true
      },
      {
        message: 'Both password fields must be filled',
        path: ['confirmPassword']
      }
    )
}

type AccountFormValues = z.infer<ReturnType<typeof getAccountFormSchema>>

function FormAccount() {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname()
  const params = useParams()
  const { setTheme } = useTheme()
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordVerified, setPasswordVerified] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const { isTimeout, setCountdown, time } = useCountdown()
  
  const t = useSettingsTranslation()
  const commonT = useCommonTranslation()
  
  const requestResetPasswordMutation = useRequestResetPasswordMutation()
  const confirmResetPasswordMutation = useConfirmResetPasswordMutation()
  const resetPasswordMutation = useResetPasswordMutation()
  const updateSettingsMutation = useUpdateSettingsMutation()
  const { data: userSettings, isLoading: isLoadingSettings } = useUserSettings()

  const { data: session } = useSession()
  const email = session?.user?.email || ''
  const verify = session?.user?.verify || USER_VERIFY_STATUS.UNVERIFIED

  // Create the schema using the translation function
  const accountFormSchema = getAccountFormSchema(t)

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
      language: userSettings?.preferences?.language || 'en',
      theme: (userSettings?.preferences?.theme as 'light' | 'dark' | 'system') || 'system',
      otp: ''
    }
  })

  function onSubmit(data: AccountFormValues) {
    console.log({ data })
    startTransition(() => {
      setTheme(data.theme)
      // @ts-expect-error -- TypeScript will validate that only known `params`
      router.replace({ pathname, params }, { locale: data.language, scroll: false })

      // Cập nhật settings vào database
      updateSettingsMutation.mutateAsync({
        language: data.language,
        theme: data.theme
      })

      // Xử lý thay đổi mật khẩu nếu có
      if (data.newPassword && data.confirmPassword && passwordVerified) {
        // Gọi API thay đổi mật khẩu
        resetPasswordMutation
          .mutateAsync({
            email: email as string,
            password: data.newPassword,
            confirmPassword: data.confirmPassword
          })
          .then((response) => {
            toast.success(response.data.message || 'Password updated successfully')

            form.setValue('newPassword', '')
            form.setValue('confirmPassword', '')
            setPasswordVerified(false)
          })
          .catch((error) => {
            handleError(error, form)
          })
      }
    })
  }

  // Cập nhật hàm gửi email
  const sendVerificationEmail = async () => {
    try {
      if (!email) {
        toast.error('Email address not found')
        return
      }

      const response = await requestResetPasswordMutation.mutateAsync({ email })
      const {
        message,
        data: { otpExpiresAt }
      } = response.data

      toast.success(message)
      localStorage.setItem('forgotPasswordOtpExpiresAt', otpExpiresAt)
      const expiresAt = new Date(otpExpiresAt).getTime()
      setCountdown(expiresAt)

      // Hiển thị form nhập OTP
      setShowOtpInput(true)
    } catch (error) {
      handleError(error, form)
    }
  }

  // Thay đổi cách xử lý OTP
  const handleVerifyOtp = async (otpValue: string) => {
    try {
      const response = await confirmResetPasswordMutation.mutateAsync({
        email,
        otp: otpValue
      })

      toast.success(response.data.message)
      setPasswordVerified(true)
      setShowOtpInput(false)
    } catch (error) {
      handleError(error, form)
    }
  }

  // Cập nhật hàm gửi lại mã
  const handleResendCode = async () => {
    try {
      form.setValue('otp', '')
      form.clearErrors('otp')
      const response = await requestResetPasswordMutation.mutateAsync({ email })
      const {
        message,
        data: { otpExpiresAt }
      } = response.data

      toast.success(message)
      localStorage.setItem('forgotPasswordOtpExpiresAt', otpExpiresAt)
      const expiresAt = new Date(otpExpiresAt).getTime()
      setCountdown(expiresAt)
    } catch (error) {
      handleError(error, form)
    }
  }

  // Cập nhật useEffect
  useEffect(() => {
    const otpExpiresAt = localStorage.getItem('forgotPasswordOtpExpiresAt')
    if (otpExpiresAt) {
      const expiresAt = new Date(otpExpiresAt).getTime()
      setCountdown(expiresAt)
    }
  }, [])

  useEffect(() => {
    if (userSettings) {
      form.setValue('language', userSettings.preferences.language || 'en')
      form.setValue('theme', (userSettings.preferences.theme as 'light' | 'dark' | 'system') || 'system')
    }
  }, [userSettings, form])

  if (isLoadingSettings) {
    return <AccountSkeleton />
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <div className='space-y-8'>
          <div>
            <FormLabel>Email</FormLabel>
            <div className='mt-2 flex items-center gap-2'>
              <div className='text-foreground font-medium'>{email}</div>
              {verify === USER_VERIFY_STATUS.VERIFIED ? (
                <Badge variant='outline' className='border-green-500/20 bg-green-500/10 text-green-500'>
                  <Check className='mr-1 h-3 w-3' />
                  {t('account.verified')}
                </Badge>
              ) : (
                <Badge variant='outline' className='border-yellow-500/20 bg-yellow-500/10 text-yellow-500'>
                  {t('account.unverified')}
                </Badge>
              )}
            </div>
            <div className='mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <p className='text-muted-foreground text-sm'>
                {t('account.emailDescription')}
              </p>
              {!passwordVerified && !showOtpInput && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='self-start sm:self-auto'
                  onClick={sendVerificationEmail}
                  disabled={requestResetPasswordMutation.isPending}
                >
                  {requestResetPasswordMutation.isPending ? (
                    <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                  ) : (
                    <Send className='mr-2 h-4 w-4' />
                  )}
                  {t('account.verifyToChangePassword')}
                </Button>
              )}
            </div>
          </div>

          {showOtpInput && (
            <>
              <FormLabel>{t('account.verificationCode')}</FormLabel>
              <p className='text-muted-foreground mb-4 text-sm'>
                {t('account.verificationCodeSentTo')} <strong>{email}</strong>
              </p>
              <div className='flex flex-col items-center space-y-4'>
                <FormField
                  control={form.control}
                  name='otp'
                  render={({ field }) => (
                    <FormItem className='mt-3 flex flex-col items-center justify-center gap-1'>
                      <FormControl>
                        <motion.div
                          animate={
                            confirmResetPasswordMutation.isPending
                              ? {
                                  scale: [1, 1.05, 1],
                                  transition: {
                                    duration: 0.5,
                                    repeat: Infinity,
                                    repeatType: 'reverse'
                                  }
                                }
                              : {}
                          }
                        >
                          <InputOTP
                            maxLength={6}
                            value={field.value || ''}
                            onChange={(value) => {
                              field.onChange(value)
                              if (value.length === 6 && !confirmResetPasswordMutation.isPending) {
                                handleVerifyOtp(value)
                              }
                            }}
                            disabled={confirmResetPasswordMutation.isPending}
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
                        </motion.div>
                      </FormControl>
                      <CustomFormMessage message={form.formState.errors.otp?.message} />
                    </FormItem>
                  )}
                />

                <div className='flex w-full items-center justify-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    className='w-fit'
                    onClick={() => {
                      form.resetField('otp', {
                        defaultValue: '',
                        keepError: false,
                        keepDirty: false,
                        keepTouched: false
                      })

                      setShowOtpInput(false)
                    }}
                  >
                    {t('account.cancelPasswordChange')}
                  </Button>
                </div>

                <Button
                  type='button'
                  variant='link'
                  onClick={handleResendCode}
                  disabled={!isTimeout || requestResetPasswordMutation.isPending}
                >
                  {requestResetPasswordMutation.isPending && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
                  {t('account.sendCodeAgain')}
                </Button>

                {!isTimeout && (
                  <div className='flex items-center justify-center'>
                    <span className='bg-secondary flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-base font-bold shadow-xs'>
                      {time}s
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {passwordVerified && (
            <>
              <div className='mb-4 flex items-center justify-between'>
                <FormLabel className='text-lg'>{t('account.newPassword')}</FormLabel>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setPasswordVerified(false)
                    form.setValue('newPassword', '')
                    form.setValue('confirmPassword', '')
                    form.resetField('otp', {
                      defaultValue: '',
                      keepError: false,
                      keepDirty: false,
                      keepTouched: false
                    })
                  }}
                >
                  {t('account.cancelPasswordChange')}
                </Button>
              </div>
              <FormField
                control={form.control}
                name='newPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder='Enter new password'
                          {...field}
                        />
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='absolute top-0 right-0 h-full px-3'
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>Create a new password with at least 6 characters.</FormDescription>
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
                      <div className='relative'>
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder='Confirm new password'
                          {...field}
                        />
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='absolute top-0 right-0 h-full px-3'
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>Re-enter your new password to confirm.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>

        <Separator />
        <h3 className='text-lg font-medium'>{t('account.language')}</h3>
        <p className='text-muted-foreground text-sm'>
          {t('account.languageDescription')}
        </p>

        <div className='space-y-8'>
          <FormField
            control={form.control}
            name='language'
            render={({ field }) => (
              <FormItem className='flex flex-col'>
                <FormLabel>{t('account.language')}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant='outline'
                        role='combobox'
                        className={cn('w-[200px] justify-between', !field.value && 'text-muted-foreground')}
                      >
                        {field.value
                          ? languages.find((language) => language.value === field.value)?.label
                          : t('account.selectLanguage')}
                        <ChevronsUpDown className='opacity-50' />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className='w-[200px] p-0'>
                    <Command>
                      <CommandInput placeholder={t('account.selectLanguage')} />
                      <CommandList>
                        <CommandEmpty>{commonT('noResultsFound')}</CommandEmpty>
                        <CommandGroup>
                          {languages.map((language) => (
                            <CommandItem
                              defaultValue={locale}
                              value={language.label}
                              key={language.value}
                              onSelect={() => {
                                form.setValue('language', language.value)
                              }}
                            >
                              <Check
                                className={cn('mr-2', language.value === field.value ? 'opacity-100' : 'opacity-0')}
                              />
                              {language.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormDescription>{t('account.languageSubDescription')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />
        <h3 className='text-lg font-medium'>{t('account.appearance')}</h3>
        <p className='text-muted-foreground text-sm'>
          {t('account.appearanceDescription')}
        </p>

        <div className='space-y-8'>
          <FormField
            control={form.control}
            name='theme'
            render={({ field }) => (
              <FormItem className='space-y-1'>
                <FormLabel>{t('account.theme')}</FormLabel>
                <FormDescription>{t('account.themeDescription')}</FormDescription>
                <FormMessage />
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className='grid max-w-[678px] gap-8 pt-2 min-[678px]:grid-cols-3'
                >
                  <FormItem>
                    <FormLabel className='[&:has([data-state=checked])>div]:border-primary flex-col'>
                      <FormControl>
                        <RadioGroupItem value='light' className='sr-only' />
                      </FormControl>
                      <div className='border-muted hover:border-accent hover:bg-accent/5 relative transform items-center rounded-md border-2 p-1 transition-all duration-200 hover:-translate-y-1 hover:shadow-md'>
                        {userSettings?.preferences?.theme === 'light' && (
                          <div className='absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-green-500/20 bg-green-500/10'>
                            <Check className='h-3 w-3 text-green-500' />
                          </div>
                        )}
                        <div className='space-y-2 rounded-sm bg-[#ecedef] p-2'>
                          <div className='space-y-2 rounded-md bg-white p-2 shadow-sm'>
                            <div className='h-2 w-[80px] rounded-lg bg-[#ecedef]' />
                            <div className='h-2 w-[100px] rounded-lg bg-[#ecedef]' />
                          </div>
                          <div className='flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm'>
                            <div className='h-4 w-4 rounded-full bg-[#ecedef]' />
                            <div className='h-2 w-[100px] rounded-lg bg-[#ecedef]' />
                          </div>
                          <div className='flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm'>
                            <div className='h-4 w-4 rounded-full bg-[#ecedef]' />
                            <div className='h-2 w-[100px] rounded-lg bg-[#ecedef]' />
                          </div>
                        </div>
                      </div>
                      <span className='block w-full p-2 text-center font-normal'>{t('account.light')}</span>
                    </FormLabel>
                  </FormItem>
                  <FormItem>
                    <FormLabel className='[&:has([data-state=checked])>div]:border-primary flex-col'>
                      <FormControl>
                        <RadioGroupItem value='dark' className='sr-only' />
                      </FormControl>
                      <div className='border-muted hover:border-accent hover:bg-accent/5 relative transform items-center rounded-md border-2 p-1 transition-all duration-200 hover:-translate-y-1 hover:shadow-md'>
                        {userSettings?.preferences?.theme === 'dark' && (
                          <div className='absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-green-500/20 bg-green-500/10'>
                            <Check className='h-3 w-3 text-green-500' />
                          </div>
                        )}
                        <div className='space-y-2 rounded-sm bg-slate-950 p-2'>
                          <div className='space-y-2 rounded-md bg-slate-800 p-2 shadow-sm'>
                            <div className='h-2 w-[80px] rounded-lg bg-slate-400' />
                            <div className='h-2 w-[100px] rounded-lg bg-slate-400' />
                          </div>
                          <div className='flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm'>
                            <div className='h-4 w-4 rounded-full bg-slate-400' />
                            <div className='h-2 w-[100px] rounded-lg bg-slate-400' />
                          </div>
                          <div className='flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm'>
                            <div className='h-4 w-4 rounded-full bg-slate-400' />
                            <div className='h-2 w-[100px] rounded-lg bg-slate-400' />
                          </div>
                        </div>
                      </div>
                      <span className='block w-full p-2 text-center font-normal'>{t('account.dark')}</span>
                    </FormLabel>
                  </FormItem>
                  <FormItem>
                    <FormLabel className='[&:has([data-state=checked])>div]:border-primary flex-col'>
                      <FormControl>
                        <RadioGroupItem value='system' className='sr-only' />
                      </FormControl>
                      <div className='border-muted hover:border-accent hover:bg-accent/5 relative transform items-center rounded-md border-2 p-1 transition-all duration-200 hover:-translate-y-1 hover:shadow-md'>
                        {userSettings?.preferences?.theme === 'system' && (
                          <div className='absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-green-500/20 bg-green-500/10'>
                            <Check className='h-3 w-3 text-green-500' />
                          </div>
                        )}
                        <SystemThemeCard />
                      </div>
                      <span className='block w-full p-2 text-center font-normal'>{t('account.system')}</span>
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormItem>
            )}
          />
        </div>

        <Button type='submit' disabled={isPending} className='transition-all'>
          {(updateSettingsMutation.isPending || resetPasswordMutation.isPending) && (
            <Loader className='size-3 animate-spin' />
          )}
          {t('account.updateSettings')}
        </Button>
      </form>
    </Form>
  )
}

export default FormAccount

function SystemThemeCard() {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return (
    <div
      className='min-h-[135px] space-y-2 rounded-sm p-2'
      style={{
        backgroundColor: systemTheme === 'dark' ? '#0f172a' : '#f8fafc',
        transition: 'background-color 0.3s ease'
      }}
    >
      <div className='flex justify-between px-2 py-[0.5px]'>
        <Sun className={`h-4 w-4 text-amber-500`} />
        <Moon className={`h-4 w-4 text-indigo-400`} />
      </div>
      <div
        className='space-y-2 rounded-md p-2 shadow-sm'
        style={{
          backgroundColor: systemTheme === 'dark' ? '#1e293b' : '#ffffff'
        }}
      >
        <div
          className='h-2 w-[80px] rounded-lg'
          style={{
            backgroundColor: systemTheme === 'dark' ? '#64748b' : '#e2e8f0'
          }}
        />
        <div
          className='h-2 w-[100px] rounded-lg'
          style={{
            backgroundColor: systemTheme === 'dark' ? '#64748b' : '#e2e8f0'
          }}
        />
      </div>
      <div
        className='flex items-center space-x-2 rounded-md p-2 shadow-sm'
        style={{
          backgroundColor: systemTheme === 'dark' ? '#1e293b' : '#ffffff'
        }}
      >
        <div
          className='h-4 w-4 rounded-full'
          style={{
            backgroundColor: systemTheme === 'dark' ? '#64748b' : '#e2e8f0'
          }}
        />
        <div
          className='h-2 w-[100px] rounded-lg'
          style={{
            backgroundColor: systemTheme === 'dark' ? '#64748b' : '#e2e8f0'
          }}
        />
      </div>
    </div>
  )
}
