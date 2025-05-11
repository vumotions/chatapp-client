import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Pin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '~/components/ui/button'
import { usePinMessage, usePinnedMessages } from '~/hooks/data/chat.hooks'
import { formatMessageContent } from '~/lib/utils'
import { useSocket } from '~/hooks/use-socket'
import { useQueryClient } from '@tanstack/react-query'
import SOCKET_EVENTS from '~/constants/socket-events'
import { toast } from 'sonner'

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
      toast.info('Đang tìm tin nhắn...')

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
        toast.success('Đã tìm thấy tin nhắn')

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
        toast.error('Không thể tìm thấy tin nhắn')
      }

      setIsOpen(false)
      setIsScrolling(false)
    } else {
      // Nếu không thể tải thêm tin nhắn cũ
      toast.error('Không thể tìm thấy tin nhắn')
      setIsOpen(false)
      setIsScrolling(false)
    }
  }

  // Xử lý khi bỏ ghim tin nhắn
  const handleUnpin = (e: React.MouseEvent, messageId: string) => {
    e.stopPropagation()
    pinMessage(messageId)
  }

  if (pinnedMessages.length === 0) return null

  return (
    <div className='relative'>
      {/* Collapsed view - shows only when slider is closed */}
      <div className='bg-muted/50 cursor-pointer border-b p-2' onClick={() => setIsOpen(true)}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Pin className='h-4 w-4' />
            <span className='text-sm font-medium'>{pinnedMessages.length} tin nhắn đã ghim</span>
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
                <span className='sr-only'>Quay lại</span>
              </Button>
              <h2 className='text-lg font-semibold'>Tin nhắn đã ghim</h2>
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
                      <div className='font-medium'>{message.senderId.name || 'Unknown'}</div>
                      <div className='text-muted-foreground text-xs'>
                        {new Date(message.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className='text-sm'>{message.content ? formatMessageContent(message.content) : ''}</div>
                    <div className='mt-2 flex justify-end'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={(e) => handleUnpin(e, message._id)}
                        disabled={isScrolling}
                      >
                        Bỏ ghim
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
