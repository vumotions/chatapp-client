import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { debounce } from 'lodash'
import { Search } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import React, { useCallback, useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import CreateGroupChatDialog from '~/components/create-group-chat-dialog'
import ConversationItem from '~/components/ui/chat/conversation-item'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import SOCKET_EVENTS from '~/constants/socket-events'
import { useArchiveChat } from '~/hooks/data/chat.hooks'
import { useSocket } from '~/hooks/use-socket'
import conversationsService from '~/services/conversations.service'
import { AnimatePresence, motion } from 'framer-motion'
import useMediaQuery from '~/hooks/use-media-query'

// Tạo component MemoizedConversationItem
const MemoizedConversationItem = React.memo<{
  conversation: any
  isActive: boolean
  onClick: () => void
  isArchived?: boolean
  onArchive?: () => void
}>(
  ({ conversation, isActive, onClick, isArchived = false, onArchive }) => {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
          layout: { type: 'spring', stiffness: 300, damping: 30 }
        }}
      >
        <ConversationItem
          conversation={conversation}
          isActive={isActive}
          onClick={onClick}
          isArchived={isArchived}
          onArchive={onArchive}
        />
      </motion.div>
    )
  },
  (prevProps, nextProps) => {
    // Chỉ re-render khi các props quan trọng thay đổi
    return (
      prevProps.conversation._id === nextProps.conversation._id &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.isArchived === nextProps.isArchived &&
      prevProps.conversation.lastMessage?._id === nextProps.conversation.lastMessage?._id
    )
  }
)

export function ChatList() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const chatId = params.chatId as string
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const queryClient = useQueryClient()
  const { socket } = useSocket()
  const { data: session } = useSession()
  const { unarchiveChat } = useArchiveChat()
  const isMobile = useMediaQuery('(max-width: 768px)')

  // Tạo một ID duy nhất cho mỗi lần render sử dụng uuid
  const [renderUniqueId] = useState(() => uuidv4())

  // Lấy view từ URL
  const activeView = (searchParams.get('view') as 'inbox' | 'archived') || 'inbox'
  // Lấy filter từ URL
  const filter = (searchParams.get('filter') as 'all' | 'unread') || 'all'

  // Tạo hàm debounced để cập nhật debouncedQuery
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetQuery = useCallback(
    debounce((value: string) => {
      setDebouncedQuery(value)
    }, 500),
    []
  )

  // Cập nhật searchQuery và gọi hàm debounced
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    debouncedSetQuery(value)
  }

  // Cleanup debounce khi unmount
  useEffect(() => {
    return () => {
      debouncedSetQuery.cancel()
    }
  }, [debouncedSetQuery])

  // Fetch danh sách cuộc trò chuyện
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useInfiniteQuery({
    queryKey: ['CHAT_LIST', debouncedQuery, filter],
    queryFn: ({ pageParam = 1 }) => conversationsService.getConversations(pageParam, 10, filter, debouncedQuery),
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.currentPage + 1
      }
      return undefined
    },
    initialPageParam: 1,
    enabled: activeView === 'inbox' // Chỉ fetch khi đang ở chế độ xem inbox
  })

  // Fetch danh sách cuộc trò chuyện đã lưu trữ
  const archivedChats = useInfiniteQuery({
    queryKey: ['ARCHIVED_CHAT_LIST', debouncedQuery, filter],
    queryFn: ({ pageParam = 1 }) => conversationsService.getArchivedChats(pageParam, 10),
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.currentPage + 1
      }
      return undefined
    },
    initialPageParam: 1,
    enabled: activeView === 'archived' // Chỉ fetch khi đang ở chế độ xem archived
  })

  // Xử lý khi click vào cuộc trò chuyện
  const handleChatClick = (id: string) => {
    // Lấy các search params hiện tại
    const params = new URLSearchParams(searchParams.toString())
    // Tạo URL mới với chatId và giữ nguyên các params
    router.push(`/messages/${id}?${params.toString()}`)
  }

  // Render skeleton khi đang tải
  const renderChatSkeletons = () => {
    return Array(5)
      .fill(0)
      .map((_, index) => (
        <div key={index} className='flex items-center space-x-4 p-2'>
          <Skeleton className='h-10 w-10 rounded-full' />
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-4 w-[200px]' />
            <Skeleton className='h-4 w-[160px]' />
          </div>
        </div>
      ))
  }

  // Tổng hợp danh sách cuộc trò chuyện từ tất cả các trang và loại bỏ trùng lặp
  const items = data?.pages.flatMap((page) => page.conversations) || []
  const uniqueItems = Array.from(new Map(items.map((item) => [item._id, item])).values())

  const archivedItems = archivedChats.data?.pages.flatMap((page) => page.conversations) || []
  const uniqueArchivedItems = Array.from(new Map(archivedItems.map((item) => [item._id, item])).values())

  // Log để kiểm tra trùng lặp
  useEffect(() => {
    if (items.length !== uniqueItems.length) {
      console.warn('Phát hiện ID trùng lặp trong danh sách chat:', items.length, uniqueItems.length)
    }
  }, [items, uniqueItems])

  // Thêm state để theo dõi khi nào cần render lại danh sách
  const [refreshKey, setRefreshKey] = useState(0)

  // Cập nhật refreshKey khi nhận tin nhắn mới
  useEffect(() => {
    if (!socket) return

    const handleReceiveMessage = (message: any) => {
      console.log('Received new message in chat list:', message)
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
      queryClient.invalidateQueries({ queryKey: ['ARCHIVED_CHAT_LIST'] })
      setRefreshKey((prev) => prev + 1)
    }

    // Lắng nghe các sự kiện liên quan đến tin nhắn
    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, handleReceiveMessage)
    socket.on('MESSAGE_UPDATED', (data) => {
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
      queryClient.invalidateQueries({ queryKey: ['ARCHIVED_CHAT_LIST'] })
      setRefreshKey((prev) => prev + 1)
    })

    return () => {
      socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE, handleReceiveMessage)
      socket.off('MESSAGE_UPDATED')
    }
  }, [socket, queryClient])

  // Xử lý khi bỏ lưu trữ cuộc trò chuyện
  const handleUnarchive = (chatId: string) => {
    console.log('Unarchiving chat', chatId)
    unarchiveChat.mutate(chatId)
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Thanh tìm kiếm và tạo nhóm */}
      <div className='flex items-center gap-2 p-4'>
        <div className='relative flex-1'>
          <Search className='text-muted-foreground absolute top-2.5 left-2 h-4 w-4' />
          <Input placeholder='Tìm kiếm tin nhắn' value={searchQuery} onChange={handleSearchChange} className='pl-8' />
        </div>
        <CreateGroupChatDialog />
      </div>

      {/* Hiển thị danh sách cuộc trò chuyện dựa trên chế độ xem hiện tại */}
      <div className='flex-1 overflow-auto'>
        {activeView === 'inbox' ? (
          // Hiển thị hộp thư đến
          <div className='flex-1 overflow-auto p-2'>
            {isLoading ? (
              renderChatSkeletons()
            ) : isError ? (
              <div className='text-muted-foreground p-4 text-center'>Không thể tải tin nhắn.</div>
            ) : items.length === 0 ? (
              <div className='text-muted-foreground p-4 text-center'>
                {searchQuery ? 'Không tìm thấy kết quả phù hợp.' : 'Không có cuộc trò chuyện nào.'}
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {uniqueItems.map((chat, index) => (
                  <MemoizedConversationItem
                    key={`${chat._id}`}
                    conversation={chat}
                    isActive={chat._id === chatId}
                    onClick={() => handleChatClick(chat._id)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        ) : (
          // Hiển thị đã lưu trữ
          <div className='flex-1 overflow-auto p-2'>
            {archivedChats.isLoading ? (
              renderChatSkeletons()
            ) : archivedChats.isError ? (
              <div className='text-muted-foreground p-4 text-center'>Không thể tải tin nhắn đã lưu trữ.</div>
            ) : archivedItems.length === 0 ? (
              <div className='text-muted-foreground p-4 text-center'>
                {searchQuery ? 'Không tìm thấy kết quả phù hợp.' : 'Không có cuộc trò chuyện nào đã lưu trữ.'}
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {uniqueArchivedItems.map((chat, index) => (
                  <MemoizedConversationItem
                    key={`archived-${chat._id}`}
                    conversation={chat}
                    isActive={chat._id === chatId}
                    onClick={() => handleChatClick(chat._id)}
                    isArchived={true}
                    onArchive={() => handleUnarchive(chat._id)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatList
