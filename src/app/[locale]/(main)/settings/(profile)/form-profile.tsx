'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { identity, pickBy } from 'lodash'
import { Camera, ChevronDown, Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import { useGetMyProfileQuery } from '~/hooks/data/auth.hooks'
import { useFileUpload } from '~/hooks/data/upload.hooks'
import { useUpdateProfileMutation } from '~/hooks/data/user.hooks'
import { handleError } from '~/lib/handlers'
import { parseDateOfBirth } from '~/lib/utils'
import ProfileFormSkeleton from './profile-form-skeleton'

const profileFormSchema = z
  .object({
    name: z.string().min(1, 'Tên không được để trống').max(50, 'Tên không được vượt quá 50 ký tự'),
    username: z
      .string()
      .min(1, 'Username không được để trống')
      .max(50, 'Username không được vượt quá 50 ký tự')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username chỉ được chứa chữ cái không dấu, số, dấu gạch ngang và gạch dưới'),
    bio: z.string().max(160, 'Giới thiệu không được vượt quá 160 ký tự').optional().or(z.literal('')),
    avatar: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
    coverPhoto: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
    day: z.string(),
    month: z.string(),
    year: z.string(),
    dob: z.string().optional()
  })
  .superRefine((data, ctx) => {
    // Kiểm tra nếu có ít nhất một trường ngày sinh được điền
    const hasPartialDate = Boolean(data.day || data.month || data.year)
    // Kiểm tra nếu tất cả các trường ngày sinh đều được điền
    const hasFullDate = Boolean(data.day && data.month && data.year)

    // Nếu chỉ có một số trường ngày sinh được điền (không phải tất cả)
    if (hasPartialDate && !hasFullDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng điền đầy đủ ngày sinh hoặc để trống tất cả',
        path: ['dob']
      })
      return
    }

    // Nếu tất cả các trường ngày sinh đều được điền, kiểm tra tính hợp lệ
    if (hasFullDate) {
      const dob = new Date(parseInt(data.year), parseInt(data.month) - 1, parseInt(data.day))

      if (
        dob.getFullYear() !== parseInt(data.year) ||
        dob.getMonth() !== parseInt(data.month) - 1 ||
        dob.getDate() !== parseInt(data.day)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ngày sinh không hợp lệ',
          path: ['dob']
        })
      }
    }
  })

type ProfileFormValues = z.infer<typeof profileFormSchema>

function ProfileForm({
  onProfileUpdated,
  redirectOnUsernameChange = false
}: {
  onProfileUpdated?: () => void
  redirectOnUsernameChange?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()
  const { data: session, update } = useSession()
  const { data: profileData, isLoading: isLoadingProfile } = useGetMyProfileQuery()
  const updateProfile = useUpdateProfileMutation()
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  // Lấy dữ liệu profile từ response
  const myProfile = profileData?.data?.data

  // Khởi tạo form với giá trị mặc định
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      username: '',
      bio: '',
      avatar: '',
      coverPhoto: '',
      day: '',
      month: '',
      year: ''
    },
    mode: 'onChange'
  })

  // Hook upload avatar
  const { mutate: uploadAvatar, isPending: isUploadingAvatar } = useFileUpload({
    onSuccess: (data) => {
      if (data?.urls && data.urls.length > 0) {
        const avatarUrl = data.urls[0]
        setAvatarPreview(avatarUrl)
        form.setValue('avatar', avatarUrl, {
          shouldDirty: true,
          shouldTouch: true
        })
        toast.success('Ảnh đại diện đã được tải lên')
      }
    },
    onError: (error) => {
      toast.error('Lỗi khi tải lên ảnh đại diện')
    }
  })

  // Hook upload cover photo
  const { mutate: uploadCover, isPending: isUploadingCover } = useFileUpload({
    onSuccess: (data) => {
      if (data?.urls && data.urls.length > 0) {
        const coverUrl = data.urls[0]
        setCoverPreview(coverUrl)
        form.setValue('coverPhoto', coverUrl, {
          shouldDirty: true,
          shouldTouch: true
        })
        toast.success('Ảnh bìa đã được tải lên')
      }
    },
    onError: (error) => {
      toast.error('Lỗi khi tải lên ảnh bìa')
    }
  })

  useEffect(() => {
    if (myProfile) {
      const { day, month, year } = parseDateOfBirth(myProfile.dateOfBirth)
      form.reset({
        name: myProfile.name || '',
        username: myProfile.username || '',
        bio: myProfile.bio || '',
        avatar: myProfile.avatar || '',
        coverPhoto: myProfile.coverPhoto || '',
        day,
        month,
        year
      })
    }
  }, [myProfile, form])

  // Xử lý khi thay đổi avatar
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadAvatar([file])
    }
  }

  // Xử lý khi thay đổi ảnh bìa
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadCover([file])
    }
  }

  // Xử lý khi submit form
  async function onSubmit(data: ProfileFormValues) {
    try {
      // Lưu username cũ để so sánh sau khi cập nhật
      const oldUsername = myProfile?.username

      // Chuẩn bị dữ liệu cơ bản
      const baseData = {
        name: data.name.trim(),
        username: data.username.trim(),
        bio: data.bio?.trim() || undefined,
        avatar: data.avatar?.trim() || undefined,
        coverPhoto: data.coverPhoto?.trim() || undefined
      }

      // Thêm dữ liệu ngày sinh nếu có
      const dateData =
        data.day && data.month && data.year
          ? {
              day: parseInt(data.day),
              month: parseInt(data.month),
              year: parseInt(data.year)
            }
          : {}

      // Kết hợp dữ liệu và loại bỏ các giá trị undefined
      const updateData = pickBy({ ...baseData, ...dateData }, identity)

      // Gọi API cập nhật thông tin
      await updateProfile.mutateAsync(updateData, {
        onSuccess: async (response) => {
          toast.success(response.data.message)

          // Cập nhật session
          if (session) {
            await update({
              ...session,
              user: {
                ...session.user,
                ...response?.data.data
              }
            })
          }

          await queryClient.invalidateQueries({ queryKey: ['my-profile'] })

          const newUsername = response?.data?.data?.username || data.username
          if (redirectOnUsernameChange) {
            startTransition(() => {
              router.push(`/profile/${newUsername}`)
            })
          } else {
            form.reset(form.getValues())

            if (onProfileUpdated) {
              onProfileUpdated()
            }
          }
        }
      })
    } catch (error) {
      handleError(error, form)
    }
  }

  // Thêm hàm xử lý reset form
  const handleReset = () => {
    if (myProfile) {
      const { day, month, year } = parseDateOfBirth(myProfile.dateOfBirth)

      // Sử dụng reset để cập nhật tất cả các giá trị cùng lúc
      form.reset({
        name: myProfile.name || '',
        username: myProfile.username || '',
        bio: myProfile.bio || '',
        avatar: myProfile.avatar || '',
        coverPhoto: myProfile.coverPhoto || '',
        day,
        month,
        year
      })

      setAvatarPreview(null)
      setCoverPreview(null)
    }
  }

  if (isLoadingProfile) {
    return <ProfileFormSkeleton />
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        {/* Cover Photo - Đặt ở đầu form */}
        <FormField
          control={form.control}
          name='coverPhoto'
          render={({ field }) => (
            <FormItem className='space-y-0'>
              <div className='bg-muted relative h-48 w-full overflow-hidden rounded-lg'>
                {coverPreview || field.value ? (
                  <img src={coverPreview || field.value} alt='Cover' className='h-full w-full object-cover' />
                ) : (
                  <div className='h-full w-full bg-gradient-to-r from-gray-700 to-gray-900' />
                )}

                {/* Hiển thị overlay loading khi đang upload */}
                {isUploadingCover && (
                  <div className='absolute inset-0 flex items-center justify-center bg-black/30'>
                    <Loader2 className='h-8 w-8 animate-spin text-white' />
                  </div>
                )}

                {/* Nút upload ảnh bìa - đặt ở góc phải */}
                <Button
                  type='button'
                  size='icon'
                  variant='ghost'
                  className='absolute top-3 right-3 cursor-pointer rounded-full bg-black/50 p-1.5 transition-colors hover:bg-black/70'
                  onClick={() => coverInputRef.current?.click()}
                  disabled={isUploadingCover}
                >
                  {isUploadingCover ? (
                    <Loader2 className='h-5 w-5 animate-spin text-white' />
                  ) : (
                    <Camera className='h-5 w-5 text-white' />
                  )}
                  <Input
                    type='file'
                    ref={coverInputRef}
                    className='hidden'
                    accept='image/*'
                    onChange={handleCoverUpload}
                    disabled={isUploadingCover}
                  />
                </Button>
              </div>
            </FormItem>
          )}
        />

        {/* Avatar - Đặt ở vị trí đè lên ảnh bìa */}
        <FormField
          control={form.control}
          name='avatar'
          render={({ field }) => (
            <FormItem className='-mt-16 ml-6'>
              <div className='relative w-fit'>
                <Avatar className='border-background h-28 w-28 border-4 shadow-md'>
                  <AvatarImage src={avatarPreview || field.value} />
                  <AvatarFallback className='text-4xl'>{form.getValues('name')?.[0] || 'U'}</AvatarFallback>
                </Avatar>

                {/* Hiển thị overlay loading khi đang upload */}
                {isUploadingAvatar && (
                  <div className='absolute inset-0 flex items-center justify-center rounded-full bg-black/30'>
                    <Loader2 className='h-6 w-6 animate-spin text-white' />
                  </div>
                )}

                {/* Nút upload avatar - đặt ở góc phải dưới */}
                <Button
                  type='button'
                  size='icon'
                  variant='ghost'
                  className='absolute right-1 bottom-1 cursor-pointer rounded-full bg-black/50 p-1.5 transition-colors hover:bg-black/70'
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <Loader2 className='h-4 w-4 animate-spin text-white' />
                  ) : (
                    <Camera className='h-4 w-4 text-white' />
                  )}
                  <input
                    type='file'
                    ref={avatarInputRef}
                    className='hidden'
                    accept='image/*'
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                  />
                </Button>
              </div>
            </FormItem>
          )}
        />

        {/* Thông tin người dùng - sử dụng thông tin từ myProfile thay vì watch */}
        <div className='mt-2 ml-6'>
          <h2 className='text-xl font-bold'>{myProfile?.name || 'Tên hiển thị'}</h2>
          <p className='text-muted-foreground text-sm'>@{myProfile?.username || 'username'}</p>
          <p className='text-muted-foreground text-sm'>{myProfile?.bio || 'Thêm giới thiệu về bạn'}</p>
        </div>

        {/* Tên hiển thị */}
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên hiển thị</FormLabel>
              <FormControl>
                <Input placeholder='Tên của bạn' {...field} />
              </FormControl>
              <FormDescription>Tên hiển thị trên trang cá nhân của bạn</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Username */}
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder='username' {...field} />
              </FormControl>
              <FormDescription>
                Đây là tên hiển thị công khai của bạn. Có thể là tên thật hoặc bút danh.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Bio */}
        <FormField
          control={form.control}
          name='bio'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Giới thiệu</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='Giới thiệu về bản thân bạn'
                  className='resize-none'
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>Bạn có thể @mention người dùng và tổ chức khác để liên kết đến họ.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Ngày sinh */}
        <div className='space-y-1.5'>
          <FormLabel>Ngày sinh</FormLabel>
          <div className='grid grid-cols-3 gap-3'>
            {/* Ngày */}
            <FormField
              control={form.control}
              name='day'
              render={({ field }) => (
                <FormItem className='w-full'>
                  <div className='relative w-full'>
                    <FormControl>
                      <Select
                        key={`day-${field.value || 'empty'}`}
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          form.trigger('dob')
                        }}
                      >
                        <SelectTrigger className='w-full font-normal'>
                          <SelectValue placeholder='Ngày'>{field.value || 'Ngày'}</SelectValue>
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

            {/* Tháng */}
            <FormField
              control={form.control}
              name='month'
              render={({ field }) => (
                <FormItem>
                  <div className='relative w-full'>
                    <FormControl>
                      <Select
                        key={`month-${field.value || 'empty'}`}
                        value={field.value ? field.value.toString() : undefined}
                        onValueChange={(value) => {
                          field.onChange(value)
                          form.trigger('dob')
                        }}
                      >
                        <SelectTrigger className='w-full truncate font-normal'>
                          <SelectValue placeholder='Tháng'>
                            {field.value ? `Tháng ${field.value}` : 'Tháng'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {[
                              { label: 'Tháng 1', month: 1 },
                              { label: 'Tháng 2', month: 2 },
                              { label: 'Tháng 3', month: 3 },
                              { label: 'Tháng 4', month: 4 },
                              { label: 'Tháng 5', month: 5 },
                              { label: 'Tháng 6', month: 6 },
                              { label: 'Tháng 7', month: 7 },
                              { label: 'Tháng 8', month: 8 },
                              { label: 'Tháng 9', month: 9 },
                              { label: 'Tháng 10', month: 10 },
                              { label: 'Tháng 11', month: 11 },
                              { label: 'Tháng 12', month: 12 }
                            ].map((line) => (
                              <SelectItem value={`${line.month}`} key={line.month}>
                                {line.label}
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

            {/* Năm */}
            <FormField
              control={form.control}
              name='year'
              render={({ field }) => (
                <FormItem>
                  <div className='relative w-full'>
                    <FormControl>
                      <Select
                        key={`year-${field.value || 'empty'}`}
                        value={field.value ? field.value.toString() : undefined}
                        onValueChange={(value) => {
                          field.onChange(value)
                          form.trigger('dob')
                        }}
                      >
                        <SelectTrigger className='w-full font-normal'>
                          <SelectValue placeholder='Năm'>{field.value ? field.value.toString() : 'Năm'}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((year) => (
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

            {/* Hiển thị lỗi */}
            <FormMessage className='col-span-3' />
          </div>
        </div>

        <div className='flex items-center gap-4'>
          <Button type='button' variant='outline' onClick={handleReset} disabled={!form.formState.isDirty}>
            Hủy thay đổi
          </Button>
          <Button
            type='submit'
            disabled={
              updateProfile.isPending || isUploadingAvatar || isUploadingCover || !form.formState.isDirty || isPending
            }
          >
            {updateProfile.isPending ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Đang cập nhật...
              </>
            ) : (
              'Cập nhật thông tin'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default ProfileForm
