'use client'

import { Loader2, UserCheck, UserPlus, UserX } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { FRIEND_REQUEST_STATUS } from '~/constants/enums'
import {
  useAcceptFriendRequestMutation,
  useCancelFriendRequestMutation,
  useRemoveFriendMutation,
  useSendFriendRequestMutation
} from '~/hooks/data/friends.hook'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import { useFriendsTranslation } from '~/hooks/use-translations'

interface FriendActionButtonProps {
  friendStatus: string | null
  otherUserId: string
  isLoading?: boolean // Thêm prop isLoading (optional)
  onStatusChange: (newStatus: string | null) => void
}

export function FriendActionButton({
  friendStatus,
  otherUserId,
  isLoading: externalLoading = false, // Đổi tên để tránh nhầm lẫn với state isLoading
  onStatusChange
}: FriendActionButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const friendsT = useFriendsTranslation()

  const sendFriendRequest = useSendFriendRequestMutation()
  const cancelFriendRequest = useCancelFriendRequestMutation()
  const acceptFriendRequest = useAcceptFriendRequestMutation()
  const removeFriend = useRemoveFriendMutation()

  // Kết hợp loading từ bên ngoài và loading nội bộ
  const isButtonDisabled = isLoading || externalLoading

  const handleFriendAction = async () => {
    // Nếu đang là bạn bè và người dùng muốn hủy kết bạn, hiển thị dialog xác nhận
    if (friendStatus === FRIEND_REQUEST_STATUS.ACCEPTED) {
      setShowConfirmDialog(true)
      return
    }

    if (isButtonDisabled) return
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
      }
    } catch (error) {
      console.error('Friend action error:', error)
      toast.error(friendsT('actionError'))
    } finally {
      setIsLoading(false)
    }
  }

  // Xử lý khi người dùng xác nhận hủy kết bạn
  const handleConfirmRemoveFriend = async () => {
    setIsLoading(true)
    try {
      await removeFriend.mutateAsync(otherUserId)
      onStatusChange(null)
      toast.success(friendsT('friendRemoved'))
    } catch (error) {
      console.error('Remove friend error:', error)
      toast.error(friendsT('removeFriendError'))
    } finally {
      setIsLoading(false)
      setShowConfirmDialog(false)
    }
  }

  // Determine button appearance based on status
  let icon = <UserPlus className='h-4 w-4' />
  let tooltipText = friendsT('sendFriendRequest')

  if (friendStatus === FRIEND_REQUEST_STATUS.PENDING) {
    icon = <UserX className='h-4 w-4' />
    tooltipText = friendsT('cancelFriendRequest')
  } else if (friendStatus === FRIEND_REQUEST_STATUS.RECEIVED) {
    icon = <UserCheck className='h-4 w-4' />
    tooltipText = friendsT('acceptFriendRequest')
  } else if (friendStatus === FRIEND_REQUEST_STATUS.ACCEPTED) {
    icon = <UserCheck className='h-4 w-4' />
    tooltipText = friendsT('alreadyFriends')
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant='ghost' size='icon' onClick={handleFriendAction} disabled={isButtonDisabled}>
            {isButtonDisabled ? <Loader2 className='h-4 w-4 animate-spin' /> : icon}
            <span className='sr-only'>{tooltipText}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>

      {/* Dialog xác nhận hủy kết bạn */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{friendsT('confirmRemoveFriend')}</DialogTitle>
            <DialogDescription>
              {friendsT('removeFriendConfirmation')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowConfirmDialog(false)}>
              {friendsT('cancel')}
            </Button>
            <Button variant='destructive' onClick={handleConfirmRemoveFriend} disabled={isLoading}>
              {isLoading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
              {friendsT('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


