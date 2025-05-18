'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '~/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Calendar } from '~/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '~/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Textarea } from '~/components/ui/textarea'
import { useMyProfileQuery } from '~/hooks/data/auth.hooks'
import { useUpdateProfileMutation } from '~/hooks/data/user.hooks'
import { handleError } from '~/lib/handlers'
import { cn } from '~/lib/utils'

const profileFormSchema = z.object({
  name: z.string().min(1, 'Tên không được để trống').max(50, 'Tên không được vượt quá 50 ký tự'),
  username: z.string().min(1, 'Username không được để trống').max(50, 'Username không được vượt quá 50 ký tự'),
  bio: z.string().max(160, 'Giới thiệu không được vượt quá 160 ký tự').optional().or(z.literal('')),
  avatar: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
  coverPhoto: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
  dateOfBirth: z.date().optional()
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

interface ProfileEditDialogProps {
  userData: any
  onProfileUpdated: () => void
  triggerButtonVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  triggerButtonSize?: 'default' | 'sm' | 'lg' | 'icon'
  triggerButtonText?: string
}

export function ProfileEditDialog({
  userData,
  onProfileUpdated,
  triggerButtonVariant = 'outline',
  triggerButtonSize = 'sm',
  triggerButtonText = 'Chỉnh sửa trang cá nhân'
}: ProfileEditDialogProps) {
  const { data: session, update } = useSession()
  const { data: myProfile, refetch: refetchProfile } = useMyProfileQuery()
  const updateProfile = useUpdateProfileMutation()
  const [open, setOpen] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  // Chuyển đổi ngày sinh từ string sang Date object nếu có
  const dateOfBirth = userData?.dateOfBirth ? new Date(userData.dateOfBirth) : undefined

  // Khởi tạo form với giá trị mặc định từ userData
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: userData?.name || '',
      username: userData?.username || '',
      bio: userData?.bio || '',
      avatar: userData?.avatar || '',
      coverPhoto: userData?.coverPhoto || '',
      dateOfBirth: dateOfBirth
    }
  })

  // Xử lý khi người dùng muốn đóng dialog
  const handleOpenChange = (newOpen: boolean) => {
    // Nếu đang mở và muốn đóng, và form có thay đổi chưa lưu
    if (open && !newOpen && form.formState.isDirty) {
      // Hiển thị dialog xác nhận
      setShowConfirmDialog(true)
    } else {
      // Nếu không có thay đổi hoặc đang mở dialog, thì thay đổi trạng thái bình thường
      setOpen(newOpen)
    }
  }

  // Xử lý khi người dùng xác nhận đóng dialog mà không lưu
  const handleConfirmClose = () => {
    setShowConfirmDialog(false)
    // Reset form về giá trị ban đầu
    form.reset()
    // Đóng dialog chính
    setOpen(false)
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

      if (data.coverPhoto?.trim()) {
        updateData.coverPhoto = data.coverPhoto.trim()
      }

      // Thêm ngày sinh nếu có
      if (data.dateOfBirth) {
        const date = new Date(data.dateOfBirth)
        updateData.day = date.getDate()
        updateData.month = date.getMonth() + 1
        updateData.year = date.getFullYear()
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
                ...response.data.data
              }
            })
          }

          // Đánh dấu form là không còn thay đổi
          form.reset(data)

          // Đóng dialog và refresh dữ liệu
          setOpen(false)
          onProfileUpdated()
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
      // Không đóng dialog khi có lỗi
    }
  }

  // Xử lý khi thay đổi avatar
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setAvatarPreview(url)
    form.setValue('avatar', url)
  }

  // Xử lý khi thay đổi ảnh bìa
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setCoverPreview(url)
    form.setValue('coverPhoto', url)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button size={triggerButtonSize} variant={triggerButtonVariant}>
            {triggerButtonText}
          </Button>
        </DialogTrigger>
        <DialogContent className='flex max-h-[90vh] flex-col sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px]'>
          <DialogHeader className='flex-shrink-0'>
            <DialogTitle>Chỉnh sửa trang cá nhân</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin cá nhân của bạn. Thông tin này sẽ được hiển thị công khai.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className='-mr-4 h-[400px] flex-grow'>
            <div className='py-2 pr-4'>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                  {/* Ảnh đại diện */}
                  <FormField
                    control={form.control}
                    name='avatar'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ảnh đại diện</FormLabel>
                        <div className='flex flex-col items-start gap-4 sm:flex-row sm:items-center'>
                          <Avatar className='h-16 w-16'>
                            <AvatarImage src={avatarPreview || field.value || userData?.avatar} />
                            <AvatarFallback>{userData?.name?.[0] || 'U'}</AvatarFallback>
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

                  {/* Ảnh bìa */}
                  <FormField
                    control={form.control}
                    name='coverPhoto'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ảnh bìa</FormLabel>
                        <div className='flex flex-col gap-2'>
                          <div className='bg-muted relative h-32 w-full overflow-hidden rounded-md'>
                            {(coverPreview || field.value || userData?.coverPhoto) && (
                              <img
                                src={coverPreview || field.value || userData?.coverPhoto}
                                alt='Cover'
                                className='h-full w-full object-cover'
                              />
                            )}
                          </div>
                          <FormControl>
                            <Input placeholder='URL ảnh bìa' {...field} onChange={handleCoverChange} />
                          </FormControl>
                        </div>
                        <FormDescription>Nhập URL ảnh bìa của bạn</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Tên và Username - 2 cột trên desktop */}
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    {/* Tên hiển thị */}
                    <FormField
                      control={form.control}
                      name='name'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Tên hiển thị <span className='text-red-500'>*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder='Tên của bạn' {...field} />
                          </FormControl>
                          <FormDescription>Tên hiển thị trên trang cá nhân</FormDescription>
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
                          <FormLabel>
                            Username <span className='text-red-500'>*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder='username' {...field} />
                          </FormControl>
                          <FormDescription>Dùng để truy cập trang cá nhân</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Giới thiệu */}
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
                        <FormDescription>Viết vài dòng giới thiệu về bản thân</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Ngày sinh */}
                  <FormField
                    control={form.control}
                    name='dateOfBirth'
                    render={({ field }) => (
                      <FormItem className='flex flex-col'>
                        <FormLabel>Ngày sinh</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? format(field.value, 'dd/MM/yyyy') : <span>Chọn ngày sinh</span>}
                                <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className='w-auto p-0' align='start'>
                            <Calendar
                              mode='single'
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>Ngày sinh của bạn</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>
          </ScrollArea>

          <DialogFooter className='mt-4 flex-shrink-0'>
            <Button type='button' variant='outline' onClick={() => handleOpenChange(false)}>
              Hủy
            </Button>
            <Button type='submit' disabled={updateProfile.isPending} onClick={form.handleSubmit(onSubmit)}>
              {updateProfile.isPending ? 'Đang cập nhật...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận khi có thay đổi chưa lưu */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có thay đổi chưa lưu</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn đóng mà không lưu các thay đổi? Tất cả các thay đổi sẽ bị mất.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tiếp tục chỉnh sửa</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>Đóng không lưu</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
