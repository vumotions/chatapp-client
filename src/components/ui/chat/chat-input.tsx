'use client'

import { format } from 'date-fns'
import { Heart, Image, Paperclip, Send, Video } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { MEDIA_TYPE } from '~/constants/enums'
import { useFileUpload } from '~/hooks/data/upload.hooks'
import { cn } from '~/lib/utils'

interface ChatInputProps {
  message: string
  onMessageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onSendMessage: () => void
  onSendHeartEmoji: () => void
  canSendMessages: boolean
  isBlockedByUser: boolean
  sendPermission?: {
    isMuted?: boolean
    mutedUntil?: string
    restrictedByGroupSettings?: boolean
    restrictUntil?: string
  }
  className?: string
  onFilesUploaded: (fileUrls: string[]) => void
  chatId: string
}

export function ChatInput({
  message,
  onMessageChange,
  onKeyDown,
  onSendMessage,
  onSendHeartEmoji,
  canSendMessages,
  isBlockedByUser,
  sendPermission,
  className,
  onFilesUploaded,
  chatId
}: ChatInputProps) {
  const [attachmentPopoverOpen, setAttachmentPopoverOpen] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const videoInputRef = React.useRef<HTMLInputElement>(null)

  // Thêm log để kiểm tra giá trị enum
  console.log('MEDIA_TYPE values:', MEDIA_TYPE)

  // Sử dụng hook upload với xử lý thành công
  const { mutate: uploadFiles, isPending: isUploading } = useFileUpload({
    onSuccess: (data) => {
      console.log('Upload success data:', data)

      if (data?.urls && data.urls.length > 0 && chatId) {
        // Gọi callback onFilesUploaded với URLs
        onFilesUploaded(data.urls)

        // Đóng popover sau khi upload thành công
        setAttachmentPopoverOpen(false)
        toast.success('Tệp đã được tải lên thành công')
      } else {
        toast.error('Không nhận được URL từ server hoặc thiếu chatId')
        setAttachmentPopoverOpen(false)
      }
    },
    onError: (error) => {
      console.error('Upload error:', error)
      toast.error('Lỗi khi tải lên tệp')
      setAttachmentPopoverOpen(false)
    }
  })

  // Handle file selection - upload ngay khi chọn file
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)

      // Upload files ngay lập tức
      uploadFiles(newFiles)

      // Reset input sau khi đã lấy files
      e.target.value = ''
    }
  }

  // Determine if we should show the send button instead of heart
  const shouldShowSendButton = message.trim().length > 0 || attachmentPopoverOpen

  // Debug logs để kiểm tra giá trị
  console.log('Message:', message)
  console.log('Message trim length:', message.trim().length)
  console.log('Attachment popover open:', attachmentPopoverOpen)
  console.log('Should show send button:', shouldShowSendButton)

  return (
    <div className={cn('p-4', className)}>
      <div className='flex items-end gap-4'>
        {/* Attachment button */}
        <Popover open={attachmentPopoverOpen} onOpenChange={setAttachmentPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              className='rounded-full'
              disabled={!canSendMessages || isBlockedByUser || isUploading}
            >
              <Paperclip className='h-5 w-5' />
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-48 p-2' side='top'>
            <div className='flex flex-col gap-2'>
              <Button
                variant='outline'
                className='justify-start'
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Image className='mr-2 h-4 w-4' />
                {isUploading ? 'Đang tải lên...' : 'Hình ảnh'}
              </Button>
              <Button
                variant='outline'
                className='justify-start'
                onClick={() => videoInputRef.current?.click()}
                disabled={isUploading}
              >
                <Video className='mr-2 h-4 w-4' />
                {isUploading ? 'Đang tải lên...' : 'Video'}
              </Button>

              {/* Hidden file inputs */}
              <input
                type='file'
                ref={fileInputRef}
                className='hidden'
                accept='image/*'
                multiple
                onChange={handleFileSelect}
              />
              <input
                type='file'
                ref={videoInputRef}
                className='hidden'
                accept='video/*'
                multiple
                onChange={handleFileSelect}
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* Message input */}
        <Input
          className='flex-1 resize-none rounded-full p-4'
          placeholder={
            isBlockedByUser
              ? 'Bạn không thể gửi tin nhắn cho người dùng này vì họ đã chặn bạn'
              : !canSendMessages
                ? sendPermission?.isMuted
                  ? `Bị cấm chat${
                      sendPermission.mutedUntil
                        ? ` đến ${format(new Date(sendPermission.mutedUntil), 'dd/MM/yyyy')}`
                        : ''
                    }`
                  : sendPermission?.restrictedByGroupSettings
                    ? `Chỉ admin được gửi tin nhắn${
                        sendPermission.restrictUntil
                          ? ` đến ${format(new Date(sendPermission.restrictUntil), 'dd/MM/yyyy')}`
                          : ''
                      }`
                    : 'Không có quyền gửi tin nhắn'
                : 'Nhập tin nhắn...'
          }
          value={message}
          onChange={onMessageChange}
          onKeyDown={onKeyDown}
          disabled={!canSendMessages || isBlockedByUser || isUploading}
        />

        {/* Send button or Heart button - Sửa lại điều kiện */}
        {message.trim().length > 0 && canSendMessages ? (
          <Button onClick={onSendMessage} size='icon' className='rounded-full'>
            <Send className='h-5 w-5' />
          </Button>
        ) : (
          <Button
            onClick={onSendHeartEmoji}
            variant='outline'
            size='icon'
            className='rounded-full hover:bg-pink-100 dark:hover:bg-pink-900/30'
            disabled={!canSendMessages || isBlockedByUser}
          >
            <Heart className='h-5 w-5 fill-pink-500 text-pink-500' />
          </Button>
        )}
      </div>
    </div>
  )
}
