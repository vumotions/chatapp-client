'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MessageSquare, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '~/components/ui/hover-card'
import { useStartConversationMutation } from '~/hooks/data/chat.hooks'

type FriendHoverCardProps = {
  friend: {
    _id: string
    name: string
    username?: string
    avatar?: string
  }
  isOnline?: boolean
  lastActive?: string
  children: React.ReactNode
}

export default function FriendHoverCard({ friend, isOnline, lastActive, children }: FriendHoverCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [processingFriendId, setProcessingFriendId] = useState<string | null>(null)
  const [processingProfileId, setProcessingProfileId] = useState<string | null>(null)

  // Khởi tạo mutation để bắt đầu cuộc trò chuyện
  const startConversation = useStartConversationMutation()

  // Xử lý khi click vào bạn bè để bắt đầu chat
  const handleStartChat = async (friendId: string) => {
    // Nếu đang xử lý cho bạn bè này, không làm gì cả
    if (processingFriendId === friendId || isPending) return

    // Đánh dấu đang xử lý cho bạn bè này
    setProcessingFriendId(friendId)

    try {
      const response = await startConversation.mutateAsync(friendId)

      // Sử dụng startTransition để đánh dấu chuyển trang
      startTransition(() => {
        router.push(`/messages/${response.data.data._id}`)
      })
    } catch (error) {
      console.error('Failed to start conversation:', error)
      // Reset trạng thái xử lý nếu có lỗi
      setProcessingFriendId(null)
    }
  }

  // Xử lý khi click vào nút Profile
  const handleViewProfile = (friendId: string, username: string) => {
    // Nếu đang trong quá trình chuyển trang, không làm gì cả
    if (isPending || processingProfileId === friendId) return

    // Đánh dấu đang xử lý cho bạn bè này
    setProcessingProfileId(friendId)

    // Sử dụng startTransition để đánh dấu chuyển trang
    startTransition(() => {
      router.push(`/profile/${username}`)
    })
  }

  // Format thời gian hoạt động gần nhất
  const formatLastActive = (lastActiveTime: string) => {
    if (!lastActiveTime) return 'Đang ngoại tuyến'
    
    try {
      const lastActiveDate = new Date(lastActiveTime)
      const now = new Date()
      const diffMs = now.getTime() - lastActiveDate.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      
      if (diffMins < 1) return 'Vừa mới truy cập'
      if (diffMins < 60) return `Hoạt động ${diffMins} phút trước`
      
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `Hoạt động ${diffHours} giờ trước`
      
      const diffDays = Math.floor(diffHours / 24)
      return `Hoạt động ${diffDays} ngày trước`
    } catch (error) {
      return 'Đang ngoại tuyến'
    }
  }

  return (
    <HoverCard openDelay={300} closeDelay={200}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className='w-72 p-4'>
        <div className='flex flex-col items-center gap-3'>
          <Avatar className='size-16'>
            <AvatarImage src={friend.avatar} alt={friend.name} />
            <AvatarFallback>{friend.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className='text-center'>
            <h4 className='text-lg font-medium'>{friend.name}</h4>
            <p className='text-muted-foreground text-sm'>
              {isOnline
                ? 'Đang hoạt động'
                : lastActive
                  ? formatLastActive(lastActive)
                  : 'Đang ngoại tuyến'}
            </p>
          </div>
          <div className='mt-2 flex w-full gap-2'>
            <Button
              variant='outline'
              size='icon'
              className='flex-1'
              onClick={() => handleViewProfile(friend._id, friend.username || '')}
              disabled={isPending || processingProfileId === friend._id}
            >
              {processingProfileId === friend._id ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <User className='size-4' />
              )}
              <span className='sr-only'>Trang cá nhân</span>
            </Button>
            <Button
              variant='default'
              size='icon'
              className='flex-1'
              onClick={() => handleStartChat(friend._id)}
              disabled={isPending || processingFriendId === friend._id}
            >
              {processingFriendId === friend._id ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <MessageSquare className='size-4' />
              )}
              <span className='sr-only'>Nhắn tin</span>
            </Button>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}




