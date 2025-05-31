'use client'

import { Loader2, MessageSquare, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
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

export default function FriendHoverCard({ friend, children }: FriendHoverCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [processingFriendId, setProcessingFriendId] = useState<string | null>(null)
  const [processingProfileId, setProcessingProfileId] = useState<string | null>(null)

  // Khởi tạo mutation để bắt đầu cuộc trò chuyện
  const startConversation = useStartConversationMutation()

  // Xử lý khi người dùng muốn bắt đầu cuộc trò chuyện
  const handleStartChat = async (friendId: string) => {
    if (isPending) return
    setProcessingFriendId(friendId)

    try {
      await startConversation.mutateAsync(friendId)
    } catch (error) {
      console.error('Failed to start conversation:', error)
    } finally {
      setProcessingFriendId(null)
    }
  }

  // Xử lý khi người dùng muốn xem trang cá nhân
  const handleViewProfile = (userId: string, username: string) => {
    if (isPending) return
    setProcessingProfileId(userId)

    startTransition(() => {
      router.push(`/profile/${username}`)
    })
  }

  return (
    <HoverCard openDelay={300} closeDelay={200}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className='w-72 p-4'>
        <div className='flex flex-col items-center gap-3'>
          <Avatar className='size-16'>
            <AvatarImage src={friend.avatar} alt={friend.name} />
            <AvatarFallback>{friend.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className='text-center'>
            <h4 className='text-lg font-medium'>{friend.name}</h4>
            {/* Đã loại bỏ phần hiển thị trạng thái online/offline */}
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
