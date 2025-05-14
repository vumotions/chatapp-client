'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { useJoinGroupByInviteLinkMutation, useGetGroupByInviteLinkQuery } from '~/hooks/data/group-chat.hooks'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Users } from 'lucide-react'
import { useSession } from 'next-auth/react'

export default function JoinGroupPage() {
  const params = useParams()
  const router = useRouter()
  const inviteLink = params.inviteLink as string
  const [isJoining, setIsJoining] = useState(false)
  const { data: session } = useSession()
  const currentUserId = session?.user?._id

  // Lấy thông tin nhóm từ link mời
  const { data: group, isLoading, error } = useGetGroupByInviteLinkQuery(inviteLink)
  
  // Mutation để tham gia nhóm
  const joinGroupMutation = useJoinGroupByInviteLinkMutation()

  // Kiểm tra xem người dùng đã là thành viên chưa
  const isAlreadyMember = group?.participants?.some(
    (participant: any) => participant._id === currentUserId
  ) || false

  // Xử lý khi có lỗi
  useEffect(() => {
    if (error) {
      toast.error('Link mời không hợp lệ hoặc đã hết hạn')
    }
  }, [error])

  // Xử lý tham gia nhóm
  const handleJoinGroup = async () => {
    if (isAlreadyMember) {
      handleGoToGroup()
      return
    }

    setIsJoining(true)
    try {
      const result = await joinGroupMutation.mutateAsync(inviteLink)
      
      if (result.status === 'PENDING') {
        toast.success('Yêu cầu tham gia đã được gửi, vui lòng chờ phê duyệt')
        router.push('/messages')
      } else if (result.conversationId) {
        toast.success('Đã tham gia nhóm thành công')
        router.push(`/messages/${result.conversationId}`)
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi tham gia nhóm')
    } finally {
      setIsJoining(false)
    }
  }

  // Xử lý chuyển đến trang tin nhắn của nhóm
  const handleGoToGroup = () => {
    if (group?._id) {
      router.push(`/messages/${group._id}`)
    } else {
      router.push('/messages')
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Tham gia nhóm chat</CardTitle>
          <CardDescription>
            Bạn đã được mời tham gia một nhóm chat
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-2">
                <Skeleton className="h-20 w-20 rounded-full" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500">
              Link mời không hợp lệ hoặc đã hết hạn
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={group?.avatar} alt={group?.name} />
                <AvatarFallback>{group?.name?.charAt(0) || 'G'}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="text-xl font-semibold">{group?.name}</h3>
                <div className="flex items-center justify-center text-sm text-muted-foreground mt-1">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{group?.memberCount || 0} thành viên</span>
                </div>
                {group?.requireApproval && !isAlreadyMember && (
                  <div className="mt-2 text-sm text-amber-500">
                    Nhóm này yêu cầu phê duyệt để tham gia
                  </div>
                )}
                {isAlreadyMember && (
                  <div className="mt-2 text-sm text-green-500">
                    Bạn đã là thành viên của nhóm này
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter>
          <div className="flex w-full space-x-2">
            <Button variant="outline" className="flex-1" onClick={() => router.push('/messages')}>
              Hủy
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleJoinGroup} 
              disabled={isLoading || isJoining || !!error}
            >
              {isJoining ? 'Đang tham gia...' : isAlreadyMember ? 'Đi đến nhóm' : 'Tham gia nhóm'}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
