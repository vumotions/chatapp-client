'use client'

import { useState, useMemo } from 'react'
import { MoreHorizontal, Archive, History, UserX, UserCheck } from 'lucide-react'
import { useArchiveChat, useClearChatHistory } from '~/hooks/data/chat.hooks'
import { useBlockUserMutation, useUnblockUserMutation, useBlockedUsers } from '~/hooks/data/user.hooks'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '~/components/ui/dialog'
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
import { Button } from '~/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { useQuery } from '@tanstack/react-query'
import httpRequest from '~/config/http-request'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { useMessagesTranslation } from '~/hooks/use-translations'

type ConversationActionsProps = {
  conversationId: string
  isArchived?: boolean
  otherUserId?: string
}

export function ConversationActions({ conversationId, isArchived = false, otherUserId }: ConversationActionsProps) {
  const [isClearHistoryDialogOpen, setIsClearHistoryDialogOpen] = useState(false)
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const { data: session } = useSession()
  const messagesT = useMessagesTranslation()

  // Sử dụng hook đã tạo
  const { archiveChat, unarchiveChat } = useArchiveChat()
  const clearChatHistory = useClearChatHistory()
  const blockUser = useBlockUserMutation()
  const unblockUser = useUnblockUserMutation()
  const { data: blockedUsers } = useBlockedUsers()

  // Kiểm tra xem người dùng đã bị block chưa
  const isUserBlocked = useMemo(() => {
    if (!blockedUsers || !otherUserId) return false

    return blockedUsers.some((user: any) => {
      const userId = typeof user === 'object' ? user._id : user
      return userId === otherUserId
    })
  }, [blockedUsers, otherUserId])

  // Xử lý khi xóa lịch sử chat
  const handleClearHistory = () => {
    setIsClearHistoryDialogOpen(false)
    setIsPopoverOpen(false)
    clearChatHistory.mutate(conversationId)
  }

  // Xử lý khi lưu trữ/bỏ lưu trữ cuộc trò chuyện
  const handleArchiveToggle = () => {
    setIsPopoverOpen(false)
    if (isArchived) {
      unarchiveChat.mutate(conversationId)
    } else {
      archiveChat.mutate(conversationId)
    }
  }

  // Xử lý khi block/unblock người dùng
  const handleBlockToggle = () => {
    setIsPopoverOpen(false)

    if (!otherUserId) {
      toast.error(messagesT('cannotIdentifyUser'))
      return
    }

    if (isUserBlocked) {
      // Unblock user ngay lập tức
      unblockUser.mutate(otherUserId)
    } else {
      // Hiển thị dialog xác nhận trước khi block
      setIsBlockDialogOpen(true)
    }
  }

  // Xử lý khi xác nhận block người dùng
  const confirmBlockUser = () => {
    if (!otherUserId) return
    blockUser.mutate(otherUserId)
    setIsBlockDialogOpen(false)
  }

  // Ngăn sự kiện lan truyền khi click vào button
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // Xác định xem có hiển thị nút block/unblock không
  const showBlockOption = !!otherUserId

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='hover:bg-secondary h-8 w-8 cursor-pointer'
            onClick={handleButtonClick}
          >
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-48 p-0' align='end'>
          <div className='space-y-1'>
            {/* Nút Archive/Unarchive */}
            <Button
              variant='ghost'
              className='text-foreground w-full justify-start'
              onClick={() => {
                handleButtonClick
                handleArchiveToggle()
              }}
            >
              <Archive className='mr-2 h-4 w-4' />
              {isArchived ? messagesT('unarchive') : messagesT('archive')}
            </Button>

            {/* Nút xóa lịch sử chat */}
            <Dialog open={isClearHistoryDialogOpen} onOpenChange={setIsClearHistoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant='ghost' className='text-foreground w-full justify-start' onClick={handleButtonClick}>
                  <History className='mr-2 h-4 w-4' />
                  {messagesT('clearChatHistory')}
                </Button>
              </DialogTrigger>
              <DialogContent onClick={handleButtonClick}>
                <DialogHeader>
                  <DialogTitle>{messagesT('clearChatHistory')}</DialogTitle>
                  <DialogDescription>
                    {messagesT('clearChatHistoryConfirmation')}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant='outline'>{messagesT('cancel')}</Button>
                  </DialogClose>
                  <Button variant='destructive' onClick={handleClearHistory}>
                    {messagesT('clearHistory')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Nút block/unblock người dùng */}
            {showBlockOption && (
              <Button
                variant='ghost'
                className='text-foreground w-full justify-start'
                onClick={() => {
                  handleButtonClick
                  handleBlockToggle()
                }}
              >
                {isUserBlocked ? (
                  <>
                    <UserCheck className='mr-2 h-4 w-4' />
                    {messagesT('unblockUser')}
                  </>
                ) : (
                  <>
                    <UserX className='mr-2 h-4 w-4' />
                    {messagesT('blockUser')}
                  </>
                )}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {isBlockDialogOpen && (
        <AlertDialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{messagesT('blockUser')}</AlertDialogTitle>
              <AlertDialogDescription>
                {messagesT('blockUserConfirmation')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button variant='outline'>{messagesT('cancel')}</Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button variant='destructive' onClick={confirmBlockUser}>
                  {messagesT('block')}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
