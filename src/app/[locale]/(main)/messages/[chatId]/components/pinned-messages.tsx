import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Pin, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import SOCKET_EVENTS from '~/constants/socket-events'
import { usePinMessage, usePinnedMessages } from '~/hooks/data/chat.hooks'
import { useSocket } from '~/hooks/use-socket'
import { useMessagesTranslation } from '~/hooks/use-translations'
import { formatMessageContent } from '~/lib/utils'

const SUCCESS_RGB = '34, 197, 94' // Giá trị RGB của màu green-500

interface PinnedMessagesProps {
  chatId: string
  onScrollToMessage?: (messageId: string) => void
  fetchOlderMessages?: () => Promise<any>
  hasMoreMessages?: boolean
  isFetchingOlderMessages?: boolean
}

export function PinnedMessages({
  chatId,
  onScrollToMessage,
  fetchOlderMessages,
  hasMoreMessages,
  isFetchingOlderMessages
}: PinnedMessagesProps) {
  const t = useMessagesTranslation()
  const queryClient = useQueryClient()
  const { socket } = useSocket()
  const { data: pinnedMessages = [] } = usePinnedMessages(chatId)
  const { mutate: pinMessage } = usePinMessage(chatId)
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)

  // Đóng panel khi có thay đổi về số lượng tin nhắn ghim
  useEffect(() => {
    setIsOpen(false)
  }, [pinnedMessages.length])

  // Lắng nghe sự kiện khi có tin nhắn được ghim/bỏ ghim
  useEffect(() => {
    if (!socket || !chatId) return

    const handleMessagePinned = (data: any) => {
      if (data.chatId !== chatId) return

      // Chỉ cần invalidate query, React Query sẽ tự động refetch khi cần
      queryClient.invalidateQueries({ queryKey: ['PINNED_MESSAGES', chatId] })
    }

    // Đăng ký lắng nghe sự kiện
    socket.on(SOCKET_EVENTS.MESSAGE_PINNED, handleMessagePinned)

    return () => {
      // Hủy đăng ký khi component unmount
      socket.off(SOCKET_EVENTS.MESSAGE_PINNED, handleMessagePinned)
    }
  }, [socket, chatId, queryClient])

  // Lắng nghe sự kiện khi có tin nhắn bị xóa
  useEffect(() => {
    if (!socket || !chatId) return

    const handleMessageDeleted = (data: { messageId: string; chatId: string }) => {
      if (data.chatId !== chatId) return

      // Kiểm tra xem tin nhắn bị xóa có trong danh sách tin nhắn ghim không
      const isPinnedMessage = pinnedMessages.some((msg: { _id: string }) => msg._id === data.messageId)

      if (isPinnedMessage) {
        console.log('Pinned message deleted, updating pinned messages list')
        // Invalidate query để cập nhật danh sách tin nhắn ghim
        queryClient.invalidateQueries({ queryKey: ['PINNED_MESSAGES', chatId] })
      }
    }

    // Đăng ký lắng nghe sự kiện xóa tin nhắn
    socket.on('MESSAGE_DELETED', handleMessageDeleted)

    return () => {
      // Hủy đăng ký khi component unmount
      socket.off('MESSAGE_DELETED', handleMessageDeleted)
    }
  }, [socket, chatId, queryClient, pinnedMessages])

  // Xử lý khi click vào tin nhắn ghim
  const handleMessageClick = async (messageId: string) => {
    if (!onScrollToMessage) return

    setIsScrolling(true)

    // Kiểm tra xem tin nhắn đã được tải chưa
    const messageElement = document.getElementById(`message-${messageId}`)

    if (messageElement) {
      // Nếu tin nhắn đã tồn tại trong DOM, cuộn đến nó
      onScrollToMessage(messageId)
      setIsOpen(false)
      setIsScrolling(false)
    } else if (fetchOlderMessages && hasMoreMessages && !isFetchingOlderMessages) {
      // Nếu tin nhắn chưa tồn tại và có thể tải thêm tin nhắn cũ
      toast.info(t('pinnedMessages.searchingForMessage'))

      // Tạo một hàm đệ quy để tải tin nhắn cũ cho đến khi tìm thấy tin nhắn cần tìm
      const findMessage = async (attempts = 0): Promise<boolean> => {
        if (attempts >= 5) {
          // Giới hạn số lần thử để tránh vòng lặp vô hạn
          return false
        }

        try {
          // Tải thêm tin nhắn cũ
          await fetchOlderMessages()

          // Kiểm tra lại xem tin nhắn đã được tải chưa
          const messageElement = document.getElementById(`message-${messageId}`)
          if (messageElement) {
            return true
          }

          // Nếu vẫn chưa tìm thấy và còn tin nhắn cũ để tải, tiếp tục tìm
          if (hasMoreMessages && !isFetchingOlderMessages) {
            return await findMessage(attempts + 1)
          }

          return false
        } catch (error) {
          console.error('Error fetching older messages:', error)
          return false
        }
      }

      const found = await findMessage()

      if (found) {
        // Nếu tìm thấy tin nhắn, cuộn đến nó
        onScrollToMessage(messageId)
        toast.success(t('pinnedMessages.messageFound'))

        // Thêm hiệu ứng highlight với màu xanh lá cây
        const messageElement = document.getElementById(`message-${messageId}`)
        if (messageElement) {
          messageElement.style.transition = 'background-color 0.5s ease'
          messageElement.style.backgroundColor = `rgba(${SUCCESS_RGB}, 0.15)`

          setTimeout(() => {
            messageElement.style.backgroundColor = ''
          }, 2000)
        }
      } else {
        // Nếu không tìm thấy tin nhắn sau nhiều lần thử
        toast.error(t('pinnedMessages.messageNotFound'))
      }

      setIsOpen(false)
      setIsScrolling(false)
    } else {
      // Nếu không thể tải thêm tin nhắn cũ
      toast.error(t('pinnedMessages.messageNotFound'))
      setIsOpen(false)
      setIsScrolling(false)
    }
  }

  // Xử lý khi bỏ ghim tin nhắn
  const handleUnpin = (e: React.MouseEvent, messageId: string) => {
    e.stopPropagation()
    pinMessage(messageId)
  }

  // Thêm hàm để hiển thị media trong tin nhắn đã ghim
  const renderPinnedMessageMedia = (message: any) => {
    if (!message.attachments || message.attachments.length === 0) return null

    return (
      <div className='mt-2 flex max-w-[200px] flex-wrap gap-2'>
        {message.attachments.map((attachment: any, index: number) => {
          const isImage = attachment.type === 'IMAGE'

          return (
            <div key={`${message._id}-attachment-${index}`} className='relative overflow-hidden rounded-lg'>
              {isImage ? (
                <img
                  src={attachment.mediaUrl}
                  alt='Image'
                  className='max-h-[100px] max-w-[200px] cursor-pointer rounded-lg object-cover'
                />
              ) : (
                <div className='relative'>
                  <video
                    src={attachment.mediaUrl}
                    className='max-h-[100px] max-w-[200px] rounded-lg'
                    controls={false}
                    muted
                    preload='metadata'
                  />
                  <div className='absolute inset-0 flex items-center justify-center bg-black/30'>
                    <Play className='h-8 w-8 text-white' />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (pinnedMessages.length === 0) return null

  return (
    <div className='relative'>
      {/* Collapsed view - shows only when slider is closed */}
      <div className='bg-muted/50 cursor-pointer border-b p-2' onClick={() => setIsOpen(true)}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Pin className='h-4 w-4' />
            <span className='text-sm font-medium'>
              {pinnedMessages.length === 1
                ? t('pinnedMessages.pinnedMessage')
                : t('pinnedMessages.pinnedMessages', { count: pinnedMessages.length })}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded view with animation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className='bg-background absolute inset-0 z-10 flex flex-col'
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ height: 'calc(100vh - 200px)' }}
          >
            <div className='flex items-center gap-3 border-b p-4'>
              <Button variant='ghost' size='icon' onClick={() => setIsOpen(false)}>
                <ArrowLeft className='h-5 w-5' />
                <span className='sr-only'>{t('pinnedMessages.backToChat')}</span>
              </Button>
              <h2 className='text-lg font-semibold'>{t('pinnedMessages.title')}</h2>
            </div>

            <div className='flex-1 space-y-4 overflow-y-auto p-4'>
              {pinnedMessages.map(
                (message: { _id: string; senderId: { name?: string }; createdAt: string; content?: string }) => (
                  <div
                    key={message._id}
                    className='bg-muted/30 hover:bg-muted/50 cursor-pointer rounded-lg p-4 transition-colors'
                    onClick={() => !isScrolling && handleMessageClick(message._id)}
                  >
                    <div className='mb-2 flex items-center gap-2'>
                      <div className='font-medium'>{message.senderId.name || t('messages.unknown')}</div>
                      <div className='text-muted-foreground text-xs'>
                        {new Date(message.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className='max-w-80 truncate text-sm'>
                      {message.content ? formatMessageContent(message.content) : ''}
                    </div>
                    {renderPinnedMessageMedia(message)}
                    <div className='mt-2 flex justify-end'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={(e) => handleUnpin(e, message._id)}
                        disabled={isScrolling}
                      >
                        {t('pinnedMessages.unpin')}
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
