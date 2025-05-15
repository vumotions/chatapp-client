'use client'

import { isAxiosError } from 'axios'
import { Clock, Loader2, XCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { GROUP_TYPE } from '~/constants/enums'
import {
  useCheckJoinRequestStatusQuery,
  useGetGroupByInviteLinkQuery,
  useJoinGroupByInviteLinkMutation
} from '~/hooks/data/group-chat.hooks'

export default function JoinGroupPage() {
  const { inviteLink } = useParams() as { inviteLink: string }
  const router = useRouter()
  const { data: session } = useSession()
  const [isAlreadyMember, setIsAlreadyMember] = useState(false)
  const [hasPendingRequest, setHasPendingRequest] = useState(false)

  // Lấy thông tin nhóm từ link mời
  const { data: group, isLoading, error } = useGetGroupByInviteLinkQuery(inviteLink)

  // Kiểm tra trạng thái yêu cầu tham gia
  const { data: requestStatus, isLoading: isLoadingRequestStatus } = useCheckJoinRequestStatusQuery(group?._id, {
    enabled: !!group?._id && !!session?.user?._id && !isAlreadyMember
  })
  console.log({ requestStatus })
  // Mutation để tham gia nhóm
  const { mutate: joinGroup, isPending: isJoining } = useJoinGroupByInviteLinkMutation()

  useEffect(() => {
    if (group && session?.user?._id) {
      // Kiểm tra xem người dùng đã là thành viên chưa
      setIsAlreadyMember(group.isParticipant || false)
    }
  }, [group, session])

  // Kiểm tra trạng thái yêu cầu tham gia
  useEffect(() => {
    if (requestStatus?.status === 'PENDING') {
      setHasPendingRequest(true)
    }
  }, [requestStatus])

  const handleJoinGroup = () => {
    if (isAlreadyMember) {
      // Nếu đã là thành viên, chuyển đến trang chat
      router.push(`/messages/${group._id}`)
      return
    }

    joinGroup(inviteLink, {
      onSuccess: (data) => {
        if (data.pending) {
          // Nếu yêu cầu đang chờ phê duyệt
          setHasPendingRequest(true)
          toast.success('Yêu cầu tham gia đã được gửi và đang chờ phê duyệt')
        } else if (data.alreadyMember) {
          // Nếu đã là thành viên
          toast.success('Bạn đã là thành viên của nhóm này')
          router.push(`/messages/${data.conversationId}`)
        } else {
          // Tham gia thành công (nhóm public)
          toast.success('Tham gia nhóm thành công!')
          router.push(`/messages/${data.conversationId}`)
        }
      },
      onError: (error: any) => {
        if (isAxiosError(error) && error.response?.status === 403) {
          const errorMessage = error.response.data?.message || 'Bạn không thể tham gia nhóm này'
          toast.error(errorMessage)
        } else {
          toast.error('Có lỗi xảy ra khi tham gia nhóm')
        }
      }
    })
  }

  return (
    <div className='container mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center py-8'>
      <Card className='w-full max-w-[450px] overflow-hidden'>
        <CardHeader className='pb-0'>
          <CardTitle className='text-center text-2xl'>Tham gia nhóm chat</CardTitle>
        </CardHeader>

        <CardContent className='p-6'>
          {isLoading ? (
            <div className='flex justify-center py-8'>
              <Loader2 className='text-primary h-8 w-8 animate-spin' />
            </div>
          ) : error ? (
            <div className='py-8 text-center'>
              <XCircle className='text-destructive mx-auto h-12 w-12' />
              <p className='mt-4 text-lg font-medium'>Link mời không hợp lệ hoặc đã hết hạn</p>
              <Button className='mt-4' onClick={() => router.push('/')}>
                Quay về trang chủ
              </Button>
            </div>
          ) : (
            <>
              <div className='flex flex-col items-center pb-6'>
                <Avatar className='h-20 w-20'>
                  <AvatarImage src={group?.avatar || '/images/placeholder.png'} alt={group?.name} />
                  <AvatarFallback>{group?.name?.charAt(0) || 'G'}</AvatarFallback>
                </Avatar>
                <h2 className='mt-4 text-xl font-bold'>{group?.name || 'Nhóm chat'}</h2>
                <p className='text-muted-foreground text-sm'>
                  {group?.participants?.length || 0} thành viên •{' '}
                  {group?.isPrivate ? 'Nhóm riêng tư' : 'Nhóm công khai'}
                </p>
              </div>

              <div className='mt-4'>
                {isLoadingRequestStatus ? (
                  <Button className='w-full' disabled>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Đang kiểm tra...
                  </Button>
                ) : hasPendingRequest ? (
                  <div className='bg-muted rounded-lg p-4 text-center'>
                    <Clock className='text-muted-foreground mx-auto h-8 w-8' />
                    <p className='mt-2 font-medium'>Yêu cầu tham gia của bạn đang chờ phê duyệt</p>
                    <p className='text-muted-foreground mt-1 text-sm'>
                      Bạn sẽ được thông báo khi quản trị viên chấp nhận yêu cầu của bạn
                    </p>
                    <Button className='mt-4' variant='outline' onClick={() => router.push('/')}>
                      Quay về trang chủ
                    </Button>
                  </div>
                ) : (
                  <Button className='w-full' onClick={handleJoinGroup} disabled={isJoining}>
                    {isJoining ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Đang xử lý...
                      </>
                    ) : isAlreadyMember ? (
                      'Đi đến nhóm chat'
                    ) : group?.isPrivate ? (
                      'Gửi yêu cầu tham gia'
                    ) : (
                      'Tham gia nhóm'
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}








