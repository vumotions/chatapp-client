'use client'

import { isAxiosError } from 'axios'
import { CheckCircle, Clock, Loader2, UserPlus, Users, Shield, Calendar } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { GROUP_TYPE } from '~/constants/enums'
import {
  useCheckJoinRequestStatusQuery,
  useGetGroupByInviteLinkQuery,
  useJoinGroupByInviteLinkMutation
} from '~/hooks/data/group-chat.hooks'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Link } from '~/i18n/navigation'

// Thêm định nghĩa kiểu dữ liệu cho admin
type Admin = {
  _id: string
  name: string
  avatar?: string
  username: string
  role: string
}

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
    <div className='from-background/60 to-background flex min-h-screen items-center justify-center bg-gradient-to-b p-4'>
      <Card className='border-border/40 bg-background/95 w-full max-w-md overflow-hidden py-0 shadow-xl'>
        {isLoading ? (
          <CardContent className='flex flex-col items-center justify-center p-6'>
            <Loader2 className='text-primary h-10 w-10 animate-spin' />
            <p className='text-muted-foreground mt-4 text-center'>Đang tải thông tin nhóm...</p>
          </CardContent>
        ) : error ? (
          <CardContent className='py-8 text-center'>
            <div className='bg-destructive/10 mx-auto mb-4 w-fit rounded-full p-3'>
              <Shield className='text-destructive h-8 w-8' />
            </div>
            <CardTitle className='mb-2 text-xl'>Link không hợp lệ</CardTitle>
            <CardDescription>
              Link mời đã hết hạn hoặc không tồn tại. Vui lòng liên hệ với người quản trị nhóm.
            </CardDescription>
            <Button className='mt-4' onClick={() => router.push('/')}>
              Quay về trang chủ
            </Button>
          </CardContent>
        ) : (
          <>
            <div className='from-primary/20 to-primary/10 relative h-32 w-full bg-gradient-to-r'>
              <div className='absolute -bottom-12 left-6'>
                <Avatar className='border-background h-24 w-24 border-4 shadow-md'>
                  <AvatarImage src={group?.avatar || undefined} alt={group?.name} />
                  <AvatarFallback className='bg-primary/20 text-2xl'>{group?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
            </div>

            <CardHeader className='pt-16 pb-4'>
              <CardTitle className='text-2xl font-bold'>{group?.name}</CardTitle>
              <div className='mt-1 flex items-center gap-2'>
                <Users className='text-muted-foreground h-4 w-4' />
                <CardDescription>
                  {group?.memberCount || 0} thành viên • Nhóm {group?.isPrivate ? 'riêng tư' : 'công khai'}
                </CardDescription>
              </div>
              {group?.createdAt && (
                <div className='mt-1 flex items-center gap-2'>
                  <Calendar className='text-muted-foreground h-4 w-4' />
                  <CardDescription>
                    Tạo {formatDistanceToNow(new Date(group.createdAt), { addSuffix: true, locale: vi })}
                  </CardDescription>
                </div>
              )}

              {/* Hiển thị chủ nhóm */}
              {group?.admins && group.admins.length > 0 && (
                <>
                  {/* Tìm người có role là OWNER */}
                  {(() => {
                    const owner = group.admins.find((admin: Admin) => admin.role === 'OWNER')
                    if (!owner) return null

                    return (
                      <div className='mt-2 flex flex-col gap-1'>
                        <CardDescription className='text-xs'>Chủ nhóm:</CardDescription>
                        <Link
                          target='_blank'
                          href={`/profile/${owner.username || owner._id}`}
                          className='mt-1 flex w-fit items-center gap-1 rounded-md'
                        >
                          <Avatar className='h-5 w-5'>
                            <AvatarImage src={owner.avatar || ''} alt={owner.name} />
                            <AvatarFallback className='text-xs'>{owner.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className='text-xs font-medium'>
                            {owner.name}
                            <Badge
                              variant='outline'
                              className='ml-1 h-4 border-yellow-500/20 bg-yellow-500/10 px-1 py-0 text-[10px] text-yellow-500'
                            >
                              Chủ nhóm
                            </Badge>
                          </span>
                        </Link>
                      </div>
                    )
                  })()}
                </>
              )}
            </CardHeader>

            <CardContent className='px-6 pb-4'>
              <p className='text-muted-foreground mb-6 text-sm'>{group?.description || 'Không có mô tả nhóm.'}</p>

              {/* Hiển thị thông tin về yêu cầu phê duyệt */}
              {group?.requireApproval && !isAlreadyMember && !hasPendingRequest && (
                <div className='mb-4 flex items-center gap-2 rounded-md bg-amber-50 p-2 text-sm text-amber-500 dark:bg-amber-950/30'>
                  <Clock className='h-4 w-4' />
                  <span>Nhóm này yêu cầu phê duyệt từ quản trị viên khi tham gia</span>
                </div>
              )}

              {isAlreadyMember ? (
                <div className='bg-primary/5 flex flex-col items-center gap-3 rounded-lg p-4'>
                  <Badge variant='outline' className='border-green-500/20 bg-green-500/10 px-3 py-1.5 text-green-500'>
                    <CheckCircle className='mr-1 h-4 w-4' />
                    Bạn đã là thành viên
                  </Badge>
                  <p className='text-muted-foreground text-center text-sm'>
                    Bạn đã tham gia nhóm chat này. Nhấn nút bên dưới để đi đến cuộc trò chuyện.
                  </p>
                </div>
              ) : hasPendingRequest ? (
                <div className='flex flex-col items-center gap-3 rounded-lg bg-yellow-500/5 p-4'>
                  <Badge
                    variant='outline'
                    className='border-yellow-500/20 bg-yellow-500/10 px-3 py-1.5 text-yellow-500'
                  >
                    <Clock className='mr-1 h-4 w-4' />
                    Đang chờ phê duyệt
                  </Badge>
                  <p className='text-muted-foreground text-center text-sm'>
                    Yêu cầu tham gia của bạn đang chờ quản trị viên phê duyệt. Bạn sẽ nhận được thông báo khi được chấp
                    nhận.
                  </p>
                </div>
              ) : null}
            </CardContent>

            <CardFooter className='flex justify-center px-6 pb-6'>
              {isAlreadyMember ? (
                <Button className='w-full' onClick={() => router.push(`/messages/${group._id}`)}>
                  Đi đến nhóm chat
                </Button>
              ) : hasPendingRequest ? (
                <Button variant='outline' className='w-full' onClick={() => router.push('/')}>
                  Quay về trang chủ
                </Button>
              ) : (
                <Button className='w-full' onClick={handleJoinGroup} disabled={isJoining}>
                  {isJoining ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <UserPlus className='mr-2 h-4 w-4' />
                      Tham gia nhóm
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  )
}
