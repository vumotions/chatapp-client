'use client'

import { useState } from 'react'
import { Trash, MoreHorizontal, Archive, History } from 'lucide-react'
import { useDeleteConversation, useArchiveChat, useClearChatHistory } from '~/hooks/data/chat.hooks'
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
import { Button } from '~/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'

type ConversationActionsProps = {
  conversationId: string
  isArchived?: boolean
}

export function ConversationActions({ conversationId, isArchived = false }: ConversationActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isClearHistoryDialogOpen, setIsClearHistoryDialogOpen] = useState(false)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  // Sử dụng hook đã tạo
  const { deleteWithUndo, pendingDeletion } = useDeleteConversation()
  const { archiveChat, unarchiveChat } = useArchiveChat()
  const clearChatHistory = useClearChatHistory()

  // Xử lý khi xóa cuộc trò chuyện
  const handleDelete = () => {
    // Đóng dialog và popover
    setIsDeleteDialogOpen(false)
    setIsPopoverOpen(false)

    // Sử dụng xóa với hoàn tác
    deleteWithUndo(conversationId)
  }

  // Xử lý khi xóa lịch sử chat
  const handleClearHistory = () => {
    // Đóng dialog và popover
    setIsClearHistoryDialogOpen(false)
    setIsPopoverOpen(false)

    // Gọi API xóa lịch sử chat
    clearChatHistory.mutate(conversationId)
  }

  // Xử lý khi lưu trữ/bỏ lưu trữ cuộc trò chuyện
  const handleArchiveToggle = () => {
    // Đóng popover
    setIsPopoverOpen(false)

    // Thực hiện lưu trữ hoặc bỏ lưu trữ
    if (isArchived) {
      unarchiveChat.mutate(conversationId)
    } else {
      archiveChat.mutate(conversationId)
    }
  }

  // Ngăn sự kiện lan truyền khi click vào button
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // Kiểm tra xem cuộc trò chuyện có đang chờ xóa không
  const isPendingDeletion = pendingDeletion === conversationId

  if (isPendingDeletion) return null // Ẩn các action nếu cuộc trò chuyện đang chờ xóa

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
              <Archive className='h-4 w-4 mr-2' />
              {isArchived ? 'Bỏ lưu trữ' : 'Lưu trữ'}
            </Button>

            {/* Nút xóa lịch sử chat */}
            <Dialog open={isClearHistoryDialogOpen} onOpenChange={setIsClearHistoryDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant='ghost'
                  className='text-foreground w-full justify-start'
                  onClick={handleButtonClick}
                >
                  <History className='h-4 w-4 mr-2' />
                  Xóa lịch sử chat
                </Button>
              </DialogTrigger>
              <DialogContent onClick={handleButtonClick}>
                <DialogHeader>
                  <DialogTitle>Xóa lịch sử chat</DialogTitle>
                  <DialogDescription>
                    Bạn có chắc chắn muốn xóa lịch sử chat? Hành động này sẽ xóa tất cả tin nhắn cũ và không thể hoàn tác.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant='outline'>Hủy</Button>
                  </DialogClose>
                  <Button variant='destructive' onClick={handleClearHistory}>
                    Xóa lịch sử
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog xóa cuộc trò chuyện */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant='ghost'
                  className='w-full justify-start text-red-500 hover:text-red-600'
                  onClick={handleButtonClick}
                >
                  <Trash className='h-4 w-4 mr-2' />
                  Xóa cuộc trò chuyện
                </Button>
              </DialogTrigger>
              <DialogContent onClick={handleButtonClick}>
                <DialogHeader>
                  <DialogTitle>Xóa cuộc trò chuyện</DialogTitle>
                  <DialogDescription>
                    Bạn có chắc chắn muốn xóa cuộc trò chuyện này? Hành động này không thể hoàn tác sau khi hoàn thành.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant='outline'>Hủy</Button>
                  </DialogClose>
                  <Button variant='destructive' onClick={handleDelete}>
                    Xóa
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

