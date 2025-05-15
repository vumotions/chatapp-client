'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { useJoinGroupByInviteLinkMutation, useGetGroupByInviteLinkQuery } from '~/hooks/data/group-chat.hooks'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Users, MessageSquare, Shield, ShieldCheck } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Separator } from '~/components/ui/separator'
import { isAxiosError } from 'axios'
import { useStartConversationMutation } from '~/hooks/data/chat.hooks'

export default function JoinGroupPage() {
  const { inviteLink } = useParams() as { inviteLink: string }
  const router = useRouter()
  const { data: session } = useSession()
  const [isAlreadyMember, setIsAlreadyMember] = useState(false)

  // Lấy thông tin nhóm từ link mời
  const { data: group, isLoading, error } = useGetGroupByInviteLinkQuery(inviteLink)
  const startConversation = useStartConversationMutation()

  // Mutation để tham gia nhóm
  const { mutate: joinGroup, isPending: isJoining } = useJoinGroupByInviteLinkMutation()

  useEffect(() => {
    if (group && session?.user?._id) {
      // Kiểm tra xem người dùng đã là thành viên chưa
      setIsAlreadyMember(group.isParticipant || false)
    }
  }, [group, session])

  // Kiểm tra xem người dùng có phải là admin hoặc owner của nhóm không
  const isAdminOrOwner = useMemo(() => {
    if (!group?.admins || !session?.user?._id) return false
    return group.admins.some((admin: any) => admin._id === session?.user?._id)
  }, [group, session])

  const handleJoinGroup = () => {
    if (isAlreadyMember) {
      // Nếu đã là thành viên, chuyển đến trang chat
      router.push(`/messages/${group._id}`)
      return
    }

    joinGroup(inviteLink, {
      onSuccess: (data) => {
        toast.success('Tham gia nhóm thành công!')
        router.push(`/messages/${data.conversationId}`)
      },
      onError: (error: any) => {
        if (isAxiosError(error) && error.response?.status === 403) {
          // Kiểm tra xem data có thuộc tính message không
          const errorMessage =
            error.response.data && typeof error.response.data === 'object' && 'message' in error.response.data
              ? error.response.data.message
              : 'Bạn không thể tham gia nhóm này'
          toast.error(errorMessage)
        } else {
          toast.error('Có lỗi xảy ra khi tham gia nhóm')
        }
      }
    })
  }

  // Hàm tạo cuộc trò chuyện mới với admin

  const handleMessageAdmin = async (adminId: string) => {
    try {
      toast.loading('Đang tạo cuộc trò chuyện...')
      await startConversation.mutateAsync(adminId)
      toast.dismiss()
    } catch (error) {
      toast.dismiss()
    }
  }

  // Hàm hiển thị icon dựa trên vai trò
  const getRoleIcon = (role: string) => {
    if (role === 'OWNER') return <ShieldCheck className='text-primary h-4 w-4' />
    if (role === 'ADMIN') return <Shield className='h-4 w-4 text-blue-500' />
    return null
  }

  // Hàm hiển thị tên vai trò
  const getRoleName = (role: string) => {
    if (role === 'OWNER') return 'Người tạo nhóm'
    if (role === 'ADMIN') return 'Quản trị viên'
    return 'Thành viên'
  }

  // Lấy thông báo lỗi từ error object
  const getErrorMessage = () => {
    if (isAxiosError(error)) {
      return error.response?.data && typeof error.response.data === 'object' && 'message' in error.response.data
        ? error.response.data.message
        : 'Link mời không hợp lệ hoặc đã hết hạn'
    }
    return 'Link mời không hợp lệ hoặc đã hết hạn'
  }

  return (
    <div className='container flex min-h-[calc(100vh-64px)] min-w-screen items-center justify-center'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>Tham gia nhóm</CardTitle>
          <CardDescription>Tham gia nhóm chat để kết nối với mọi người</CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className='space-y-4'>
              <div className='flex flex-col items-center space-y-2'>
                <Skeleton className='h-20 w-20 rounded-full' />
                <Skeleton className='h-6 w-40' />
                <Skeleton className='h-4 w-24' />
              </div>
            </div>
          ) : error ? (
            <div className='space-y-4'>
              <div className='mb-4 text-center text-red-500'>{getErrorMessage()}</div>
            </div>
          ) : (
            <div className='flex flex-col items-center space-y-4'>
              <Avatar className='h-20 w-20'>
                <AvatarImage src={group?.avatar} alt={group?.name} />
                <AvatarFallback>{group?.name?.charAt(0) || 'G'}</AvatarFallback>
              </Avatar>
              <div className='text-center'>
                <h3 className='text-xl font-semibold'>{group?.name}</h3>
                <div className='text-muted-foreground flex items-center justify-center text-sm'>
                  <Users className='mr-1 h-4 w-4' />
                  <span>{group?.memberCount || 0} thành viên</span>
                </div>
                {group?.requireApproval && !isAlreadyMember && (
                  <div className='mt-2 text-sm text-amber-500'>Nhóm này yêu cầu phê duyệt để tham gia</div>
                )}
                {!group?.requireApproval && group?.groupType !== 'PRIVATE' && !isAlreadyMember && (
                  <div className='mt-2 text-sm text-green-500'>Nhóm công khai - Bạn có thể tham gia ngay lập tức</div>
                )}
                {isAlreadyMember && (
                  <div className='mt-2 text-sm text-green-500'>
                    {isAdminOrOwner ? 'Bạn là quản trị viên của nhóm này' : 'Bạn đã là thành viên của nhóm này'}
                  </div>
                )}
                {group?.hasLeftGroup && (
                  <div className='mt-2 text-sm text-red-500'>
                    {group.errorMessage || 'Bạn đã rời khỏi nhóm này trước đó'}
                  </div>
                )}
              </div>

              {/* Hiển thị thông tin quản trị viên */}
              {group?.admins && group.admins.length > 0 && (
                <div className='mt-4 w-full'>
                  <Separator className='my-2' />
                  <h4 className='mb-2 text-sm font-medium'>Quản trị viên nhóm:</h4>
                  <div className='space-y-3'>
                    {group.admins.map((admin: any) => (
                      <div key={admin._id} className='flex items-center justify-between rounded-md border p-2'>
                        <div className='flex items-center gap-2'>
                          <Avatar className='h-10 w-10'>
                            <AvatarImage src={admin.avatar} alt={admin.name} />
                            <AvatarFallback>{admin.name?.charAt(0) || 'A'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className='flex items-center gap-1'>
                              <p className='font-medium'>{admin.name}</p>
                              {getRoleIcon(admin.role)}
                            </div>
                            <p className='text-muted-foreground text-xs'>{getRoleName(admin.role)}</p>
                          </div>
                        </div>
                        {/* Chỉ hiển thị nút nhắn tin nếu người dùng không phải là admin của nhóm */}
                        {session?.user?._id !== admin._id && (
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => handleMessageAdmin(admin._id)}
                            title='Gửi tin nhắn'
                          >
                            <MessageSquare className='h-5 w-5' />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter>
          <div className='flex w-full space-x-2'>
            <Button variant='outline' className='flex-1' onClick={() => router.push('/messages')}>
              Hủy
            </Button>
            <Button
              className='flex-1'
              onClick={handleJoinGroup}
              disabled={isLoading || isJoining || !!error || group?.hasLeftGroup}
            >
              {isJoining ? 'Đang tham gia...' : isAlreadyMember ? 'Đi đến nhóm' : 'Tham gia nhóm'}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
