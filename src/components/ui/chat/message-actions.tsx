'use client'

import { Pencil, Pin, PinOff, Trash } from 'lucide-react'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Textarea } from '~/components/ui/textarea'
import { MESSAGE_TYPE } from '~/constants/enums'
import { useDeleteMessage, useEditMessage, usePinMessage } from '~/hooks/data/chat.hooks'
import { Message } from '~/types/common.types'

interface MessageActionsProps {
  message: Message
  chatId: string
  isSentByMe: boolean
  onEditStart?: () => void
}

export function MessageActions({ message, chatId, isSentByMe, onEditStart }: MessageActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editedContent, setEditedContent] = useState(message.content)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  // Sử dụng hook đã cập nhật
  const { deleteWithUndo, pendingDeletion, mutation: deleteMessage } = useDeleteMessage(chatId)
  const editMessage = useEditMessage(chatId)
  const { mutate: pinMessage } = usePinMessage(chatId)

  // Chỉ cho phép xóa/sửa tin nhắn của chính mình
  const canModify = isSentByMe && message.type === MESSAGE_TYPE.TEXT

  // Xử lý khi xóa tin nhắn
  const handleDelete = () => {
    // Đóng dialog và popover
    setIsDeleteDialogOpen(false)
    setIsPopoverOpen(false)

    // Sử dụng xóa với hoàn tác thay vì xóa ngay lập tức
    deleteWithUndo(message._id)
  }

  // Xử lý khi chỉnh sửa tin nhắn
  const handleEdit = () => {
    if (editedContent.trim() === message.content) {
      setIsEditDialogOpen(false)
      setIsPopoverOpen(false)
      return
    }

    editMessage.mutate(
      {
        messageId: message._id,
        content: editedContent.trim()
      },
      {
        onSuccess: () => {
          console.log('Message edited successfully')
          setIsEditDialogOpen(false)
          setIsPopoverOpen(false)
        },
        onError: (error) => {
          console.error('Failed to edit message:', error)
          // Dialog vẫn mở để người dùng có thể thử lại
        }
      }
    )
  }

  // Xử lý khi ghim/bỏ ghim tin nhắn
  const handlePin = () => {
    pinMessage(message._id)
    setIsPopoverOpen(false)
  }

  // Kiểm tra xem tin nhắn có đang chờ xóa không
  const isPendingDeletion = pendingDeletion === message._id

  // Sửa lại điều kiện hiển thị
  if (!canModify) return null
  // Bỏ dòng này để vẫn hiển thị actions khi tin nhắn đang chờ xóa
  // if (isPendingDeletion) return null // Ẩn các action nếu tin nhắn đang chờ xóa

  // Tạo một component riêng cho icon menu
  const MenuIcon = () => {
    return (
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='24'
        height='24'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        className='h-4 w-4'
      >
        <circle cx='12' cy='12' r='1' />
        <circle cx='12' cy='5' r='1' />
        <circle cx='12' cy='19' r='1' />
      </svg>
    )
  }

  return (
    <>
      <Popover open={isPopoverOpen && !isPendingDeletion} onOpenChange={(open) => {
        // Chỉ cho phép mở popover nếu tin nhắn không đang chờ xóa
        if (isPendingDeletion && open) return
        setIsPopoverOpen(open)
      }}>
        <PopoverTrigger asChild>
          <Button 
            variant='ghost' 
            className={`h-8 w-8 p-0 ${isPendingDeletion ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isPendingDeletion}
          >
            <span className='sr-only'>Mở menu</span>
            <MenuIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-36 p-0'>
          <div className='grid gap-1'>
            <Button
              variant='ghost'
              className='flex cursor-pointer items-center justify-start gap-2 px-2 py-1.5 text-sm'
              onClick={() => {
                setIsEditDialogOpen(true)
                setIsPopoverOpen(false)
              }}
              disabled={isPendingDeletion}
            >
              <Pencil className='h-4 w-4' />
              <span>Chỉnh sửa</span>
            </Button>
            <Button
              variant='ghost'
              className='flex cursor-pointer items-center justify-start gap-2 px-2 py-1.5 text-sm'
              onClick={handlePin}
              disabled={isPendingDeletion}
            >
              {message.isPinned ? (
                <>
                  <PinOff className='h-4 w-4' />
                  <span>Bỏ ghim</span>
                </>
              ) : (
                <>
                  <Pin className='h-4 w-4' />
                  <span>Ghim tin nhắn</span>
                </>
              )}
            </Button>
            <Button
              variant='ghost'
              className='text-destructive hover:text-destructive flex cursor-pointer items-center justify-start gap-2 px-2 py-1.5 text-sm'
              onClick={handleDelete}
              disabled={isPendingDeletion}
            >
              <Trash className='h-4 w-4' />
              <span>Xóa</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Dialog chỉnh sửa tin nhắn */}
      {isEditDialogOpen && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle>Chỉnh sửa tin nhắn</DialogTitle>
              <p className='text-muted-foreground text-sm'>Chỉnh sửa nội dung tin nhắn của bạn</p>
            </DialogHeader>
            <div className='flex items-center space-x-2'>
              <div className='grid flex-1 gap-2'>
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className='min-h-[100px]'
                />
              </div>
            </div>
            <DialogFooter className='sm:justify-end'>
              <DialogClose asChild>
                <Button type='button' variant='secondary'>
                  Hủy
                </Button>
              </DialogClose>
              <Button
                type='button'
                onClick={handleEdit}
                disabled={editedContent.trim() === message.content || editedContent.trim() === ''}
              >
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}



