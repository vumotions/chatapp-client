'use client'

import { useState } from 'react'
import { MoreHorizontal, Archive, History } from 'lucide-react'
import { useArchiveChat, useClearChatHistory } from '~/hooks/data/chat.hooks'
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
  const [isClearHistoryDialogOpen, setIsClearHistoryDialogOpen] = useState(false)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  // Sử dụng hook đã tạo
  const { archiveChat, unarchiveChat } = useArchiveChat()
  const clearChatHistory = useClearChatHistory()

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
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}


