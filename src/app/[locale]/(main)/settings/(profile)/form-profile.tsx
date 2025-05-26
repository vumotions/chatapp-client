'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { useGetMyProfileQuery } from '~/hooks/data/auth.hooks'
import { useUpdateProfileMutation } from '~/hooks/data/user.hooks'
import { handleError } from '~/lib/handlers'

const profileFormSchema = z.object({
  name: z.string().min(1, 'Tên không được để trống').max(50, 'Tên không được vượt quá 50 ký tự'),
  username: z.string().min(1, 'Username không được để trống').max(50, 'Username không được vượt quá 50 ký tự'),
  bio: z.string().max(160, 'Giới thiệu không được vượt quá 160 ký tự').optional().or(z.literal('')),
  avatar: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
  urls: z
    .array(
      z.object({
        value: z.string().url('URL không hợp lệ')
      })
    )
    .optional()
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

function ProfileForm() {
  const { data: session, update } = useSession()
  const { data: profileData, refetch: refetchProfile } = useGetMyProfileQuery()
  const updateProfile = useUpdateProfileMutation()
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Lấy dữ liệu profile từ response
  const myProfile = profileData?.data?.data

  // Khởi tạo form với giá trị mặc định từ profile
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: myProfile?.name || '',
      username: myProfile?.username || '',
      bio: myProfile?.bio || '',
      avatar: myProfile?.avatar || '',
      urls: [{ value: '' }]
    },
    mode: 'onChange'
  })

  // Xử lý khi thay đổi avatar
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setAvatarPreview(url)
    form.setValue('avatar', url)
  }

  // Xử lý khi submit form
  async function onSubmit(data: ProfileFormValues) {
    try {
      // Chuẩn bị dữ liệu để gửi lên server
      const updateData: any = {
        name: data.name.trim(),
        username: data.username.trim()
      }

      // Chỉ thêm các trường không bắt buộc nếu chúng có giá trị
      if (data.bio?.trim()) {
        updateData.bio = data.bio.trim()
      }

      if (data.avatar?.trim()) {
        updateData.avatar = data.avatar.trim()
      }

      // Gọi API cập nhật thông tin
      await updateProfile.mutateAsync(updateData, {
        onSuccess: async (response) => {
          toast.success('Cập nhật thông tin thành công')

          // Cập nhật session
          if (session) {
            await update({
              ...session,
              user: {
                ...session.user,
                ...(response as any)?.data.data
              }
            })
          }

          // Refresh dữ liệu
          refetchProfile()
        },
        onError: (error: any) => {
          // Xử lý lỗi validation từ server
          handleError(error, form)
        }
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      // Xử lý lỗi validation từ server nếu có
      if (error && typeof error === 'object') {
        handleError(error, form)
      } else {
        toast.error('Có lỗi xảy ra khi cập nhật thông tin')
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
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
                Đây là tên hiển thị công khai của bạn. Có thể là tên thật hoặc bút danh. Bạn chỉ có thể thay đổi mỗi 30
                ngày một lần.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Ảnh đại diện */}
        <FormField
          control={form.control}
          name='avatar'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ảnh đại diện</FormLabel>
              <div className='flex flex-col items-start gap-4 sm:flex-row sm:items-center'>
                <Avatar className='h-16 w-16'>
                  <AvatarImage src={avatarPreview || field.value || myProfile?.avatar} />
                  <AvatarFallback>{myProfile?.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <FormControl className='w-full'>
                  <Input placeholder='URL ảnh đại diện' {...field} onChange={handleAvatarChange} />
                </FormControl>
              </div>
              <FormDescription>Nhập URL ảnh đại diện của bạn</FormDescription>
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

        {/* URLs */}
        <div>
          <FormLabel>URLs</FormLabel>
          <FormDescription className='mb-2'>
            Thêm liên kết đến trang web, blog hoặc hồ sơ mạng xã hội của bạn.
          </FormDescription>

          <div className='space-y-3'>
            <FormField
              control={form.control}
              name='urls.0.value'
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder='https://example.com' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type='button'
              variant='outline'
              size='sm'
              className='mt-2'
              onClick={() => {
                // Thêm URL mới (có thể mở rộng thêm)
                toast.info('Tính năng đang phát triển')
              }}
            >
              Thêm URL
            </Button>
          </div>
        </div>

        <Button type='submit' disabled={updateProfile.isPending}>
          {updateProfile.isPending ? 'Đang cập nhật...' : 'Cập nhật thông tin'}
        </Button>
      </form>
    </Form>
  )
}

export default ProfileForm
