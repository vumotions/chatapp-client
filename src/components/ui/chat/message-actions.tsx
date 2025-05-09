'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash, MoreHorizontal } from 'lucide-react'
import { useDeleteMessage, useEditMessage } from '~/hooks/data/chat.hooks'
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
import { Textarea } from '~/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Message } from '~/types/common.types'
import { useSession } from 'next-auth/react'
import { MESSAGE_TYPE } from '~/constants/enums'

interface MessageActionsProps {
  message: Message
  chatId: string
  isSentByMe: boolean
  onEditStart?: () => void
}

export function MessageActions({ message, chatId, isSentByMe, onEditStart }: MessageActionsProps) {
  const { data: session } = useSession()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editedContent, setEditedContent] = useState(message.content)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  
  // Sử dụng hook đã cập nhật
  const { deleteWithUndo, pendingDeletion, mutation: deleteMessage } = useDeleteMessage(chatId)
  const editMessage = useEditMessage(chatId)
  
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
    console.log('Editing message:', message._id, 'with content:', editedContent.trim())
    
    if (editedContent.trim() === message.content) {
      setIsEditDialogOpen(false)
      setIsPopoverOpen(false)
      return
    }
    
    editMessage.mutate({
      messageId: message._id,
      content: editedContent.trim()
    }, {
      onSuccess: () => {
        console.log('Message edited successfully')
        setIsEditDialogOpen(false)
        setIsPopoverOpen(false)
      },
      onError: (error) => {
        console.error('Failed to edit message:', error)
        // Dialog vẫn mở để người dùng có thể thử lại
      }
    })
  }
  
  // Kiểm tra xem tin nhắn có đang chờ xóa không
  const isPendingDeletion = pendingDeletion === message._id
  
  if (!canModify) return null
  if (isPendingDeletion) return null // Ẩn các action nếu tin nhắn đang chờ xóa
  
  // Tạo một component riêng cho icon menu
  const MenuIcon = () => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <circle cx="12" cy="12" r="1" />
        <circle cx="12" cy="5" r="1" />
        <circle cx="12" cy="19" r="1" />
      </svg>
    )
  }

  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Mở menu</span>
            <MenuIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56">
          <div className="grid gap-1">
            <Button
              variant="ghost"
              className="flex cursor-pointer items-center justify-start gap-2 px-2 py-1.5 text-sm"
              onClick={() => {
                setIsEditDialogOpen(true)
                setIsPopoverOpen(false)
              }}
            >
              <Pencil className="h-4 w-4" />
              <span>Chỉnh sửa</span>
            </Button>
            <Button
              variant="ghost"
              className="flex cursor-pointer items-center justify-start gap-2 px-2 py-1.5 text-sm text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash className="h-4 w-4" />
              <span>Xóa</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Dialog chỉnh sửa tin nhắn */}
      {isEditDialogOpen && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa tin nhắn</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Chỉnh sửa nội dung tin nhắn của bạn
              </p>
            </DialogHeader>
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter className="sm:justify-end">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Hủy
                </Button>
              </DialogClose>
              <Button 
                type="button" 
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










