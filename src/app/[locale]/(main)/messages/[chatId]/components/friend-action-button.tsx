'use client'

import { UserPlus, UserCheck, UserX, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { FRIEND_REQUEST_STATUS } from '~/constants/enums'
import { 
  useAcceptFriendRequestMutation, 
  useCancelFriendRequestMutation,
  useRejectFriendRequestMutation,
  useSendFriendRequestMutation,
  useRemoveFriendMutation
} from '~/hooks/data/friends.hook'

interface FriendActionButtonProps {
  friendStatus: string | null
  otherUserId: string
  onStatusChange: (newStatus: string | null) => void
}

export function FriendActionButton({ friendStatus, otherUserId, onStatusChange }: FriendActionButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  const sendFriendRequest = useSendFriendRequestMutation()
  const cancelFriendRequest = useCancelFriendRequestMutation()
  const acceptFriendRequest = useAcceptFriendRequestMutation()
  const rejectFriendRequest = useRejectFriendRequestMutation()
  const removeFriend = useRemoveFriendMutation()

  const handleFriendAction = async () => {
    if (isLoading) return
    setIsLoading(true)
    
    try {
      if (friendStatus === null) {
        // Send friend request
        await sendFriendRequest.mutateAsync(otherUserId)
        onStatusChange(FRIEND_REQUEST_STATUS.PENDING)
      } else if (friendStatus === FRIEND_REQUEST_STATUS.PENDING) {
        // Cancel friend request
        await cancelFriendRequest.mutateAsync(otherUserId)
        onStatusChange(null)
      } else if (friendStatus === FRIEND_REQUEST_STATUS.RECEIVED) {
        // Accept friend request
        await acceptFriendRequest.mutateAsync(otherUserId)
        onStatusChange(FRIEND_REQUEST_STATUS.ACCEPTED)
      } else if (friendStatus === FRIEND_REQUEST_STATUS.ACCEPTED) {
        // Remove friend
        await removeFriend.mutateAsync(otherUserId)
        onStatusChange(null)
      }
    } catch (error) {
      console.error('Friend action error:', error)
      toast.error('Có lỗi xảy ra. Vui lòng thử lại sau.')
    } finally {
      setIsLoading(false)
    }
  }

  // Determine button appearance based on status
  let icon = <UserPlus className="h-4 w-4" />
  let tooltipText = 'Gửi lời mời kết bạn'

  if (friendStatus === FRIEND_REQUEST_STATUS.PENDING) {
    icon = <UserX className="h-4 w-4" />
    tooltipText = 'Hủy lời mời kết bạn'
  } else if (friendStatus === FRIEND_REQUEST_STATUS.RECEIVED) {
    icon = <UserCheck className="h-4 w-4" />
    tooltipText = 'Chấp nhận lời mời kết bạn'
  } else if (friendStatus === FRIEND_REQUEST_STATUS.ACCEPTED) {
    icon = <UserX className="h-4 w-4" />
    tooltipText = 'Hủy kết bạn'
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleFriendAction}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
          <span className="sr-only">{tooltipText}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  )
}