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
      toast.error('Có lỗi xảy ra. Vui lòng thử lại sau.')
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
      toast.success('Đã hủy kết bạn')
    } catch (error) {
      console.error('Remove friend error:', error)
      toast.error('Có lỗi xảy ra khi hủy kết bạn. Vui lòng thử lại sau.')
    } finally {
      setIsLoading(false)
      setShowConfirmDialog(false)
    }
  }

  // Determine button appearance based on status
  let icon = <UserPlus className='h-4 w-4' />
  let tooltipText = 'Gửi lời mời kết bạn'

  if (friendStatus === FRIEND_REQUEST_STATUS.PENDING) {
    icon = <UserX className='h-4 w-4' />
    tooltipText = 'Hủy lời mời kết bạn'
  } else if (friendStatus === FRIEND_REQUEST_STATUS.RECEIVED) {
    icon = <UserCheck className='h-4 w-4' />
    tooltipText = 'Chấp nhận lời mời kết bạn'
  } else if (friendStatus === FRIEND_REQUEST_STATUS.ACCEPTED) {
    icon = <UserCheck className='h-4 w-4' />
    tooltipText = 'Đã là bạn bè'
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
            <DialogTitle>Xác nhận hủy kết bạn</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn hủy kết bạn? Hành động này sẽ xóa tất cả các kết nối bạn bè giữa hai người.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowConfirmDialog(false)}>
              Hủy
            </Button>
            <Button 
              variant='destructive' 
              onClick={handleConfirmRemoveFriend}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className='h-4 w-4 animate-spin mr-2' /> : null}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}



