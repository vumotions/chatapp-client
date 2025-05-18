'use client'

import { useQuery } from '@tanstack/react-query'
import { Pencil, Pin, PinOff, Trash } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Textarea } from '~/components/ui/textarea'
import httpRequest from '~/config/http-request'
import { MEMBER_ROLE, MESSAGE_TYPE } from '~/constants/enums'
import { useDeleteMessage, useEditMessage, usePinMessage } from '~/hooks/data/chat.hooks'
import { Message } from '~/types/common.types'

interface MessageActionsProps {
  message: Message
  chatId: string
  isSentByMe: boolean
  onEditStart?: () => void
}

export function MessageActions({ message, chatId, isSentByMe, onEditStart }: MessageActionsProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editedContent, setEditedContent] = useState(message.content)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const { data: session } = useSession()
  const currentUserId = session?.user?._id

  // Sử dụng hook đã cập nhật
  const { deleteWithUndo, pendingDeletion, mutation: deleteMessage } = useDeleteMessage(chatId)
  const editMessage = useEditMessage(chatId)
  const { mutate: pinMessage } = usePinMessage(chatId)

  // Kiểm tra quyền của người dùng hiện tại trong nhóm chat
  const { data: conversation } = useQuery({
    queryKey: ['GROUP_DETAILS', chatId],
    queryFn: async () => {
      const response = await httpRequest.get(`/chat/${chatId}`)
      return response.data.data
    },
    enabled: !!chatId
  })

  // Tìm thông tin thành viên hiện tại
  const currentMember = conversation?.members?.find((m: any) => {
    // Xử lý cả trường hợp userId là object hoặc string
    const memberId = typeof m.userId === 'object' ? m.userId._id : m.userId
    return memberId === currentUserId
  })

  // Kiểm tra quyền
  const isOwner = currentMember?.role === MEMBER_ROLE.OWNER
  const isAdmin = currentMember?.role === MEMBER_ROLE.ADMIN
  const hasDeletePermission = currentMember?.permissions?.deleteMessages === true
  const hasPinPermission = currentMember?.permissions?.pinMessages === true

  // Kiểm tra quyền xóa và ghim tin nhắn
  const isOwnMessage = isSentByMe && message.type === MESSAGE_TYPE.TEXT
  const canEdit = isOwnMessage // Chỉ cho phép chỉnh sửa tin nhắn của chính mình
  
  // Kiểm tra xem người gửi tin nhắn có phải là owner không
  // Cần kiểm tra từ conversation để xác định role của người gửi
  const isMessageFromOwner = conversation?.members?.some((member: any) => {
    const memberId = typeof member.userId === 'object' ? member.userId._id : member.userId
    return memberId === message.userId && member.role === MEMBER_ROLE.OWNER
  })
  
  // Admin không thể xóa tin nhắn của owner
  const canDelete = isOwnMessage || 
                   (isOwner) || 
                   (isAdmin && hasDeletePermission && !isMessageFromOwner)
  
  // Chỉ owner hoặc admin có quyền pinMessages mới có thể ghim/bỏ ghim tin nhắn
  // Admin không thể ghim/bỏ ghim tin nhắn của owner
  const canPin = isOwner || (isAdmin && hasPinPermission && !isMessageFromOwner)

  // Xử lý khi xóa tin nhắn
  const handleDelete = () => {
    // Đóng popover
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
          setIsEditDialogOpen(false)
          setIsPopoverOpen(false)
        },
        onError: (error) => {
          console.error('Failed to edit message:', error)
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

  // Nếu không có quyền thực hiện bất kỳ hành động nào, không hiển thị menu
  if (!canEdit && !canDelete && !canPin) return null
  
  // Nếu tin nhắn đang chờ xóa, không hiển thị menu
  if (isPendingDeletion) return null

  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <span className='sr-only'>Mở menu</span>
            <MenuIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-36 p-0'>
          <div className='grid gap-1'>
            {canEdit && (
              <Button
                variant='ghost'
                className='flex cursor-pointer items-center justify-start gap-2 px-2 py-1.5 text-sm'
                onClick={() => {
                  setIsEditDialogOpen(true)
                  setIsPopoverOpen(false)
                  if (onEditStart) onEditStart()
                }}
              >
                <Pencil className='h-4 w-4' />
                <span>Chỉnh sửa</span>
              </Button>
            )}

            {canPin && (
              <Button
                variant='ghost'
                className='flex cursor-pointer items-center justify-start gap-2 px-2 py-1.5 text-sm'
                onClick={handlePin}
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
            )}

            {canDelete && (
              <Button
                variant='ghost'
                className='text-destructive hover:text-destructive flex cursor-pointer items-center justify-start gap-2 px-2 py-1.5 text-sm'
                onClick={handleDelete}
              >
                <Trash className='h-4 w-4' />
                <span>Xóa</span>
              </Button>
            )}
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









