import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { debounce } from 'lodash'
import { Search } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import React, { useCallback, useEffect, useState } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import CreateGroupChatDialog from '~/components/create-group-chat-dialog'
import ConversationItem from '~/components/ui/chat/conversation-item'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import SOCKET_EVENTS from '~/constants/socket-events'
import { useArchiveChat, useChatList } from '~/hooks/data/chat.hooks'
import { useSocket } from '~/hooks/use-socket'
import { useMessagesTranslation } from '~/hooks/use-translations'
import conversationsService from '~/services/conversations.service'

// Tạo component MemoizedConversationItem
const MemoizedConversationItem = React.memo<{
  conversation: any
  isActive: boolean
  onClick: () => void
  isArchived?: boolean
  onArchive?: () => void
}>(
  ({ conversation, isActive, onClick, isArchived = false, onArchive }) => {
    const { data: session } = useSession()

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
  const { unarchiveChat } = useArchiveChat()
  const messagesT = useMessagesTranslation()

  const activeView = (searchParams.get('view') as 'inbox' | 'archived') || 'inbox'
  const filter = (searchParams.get('filter') as 'all' | 'unread') || 'all'

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetQuery = useCallback(
    debounce((value: string) => {
      setDebouncedQuery(value)
    }, 500),
    []
  )

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

  // Sử dụng hook useChatList với enabled phù hợp
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useChatList(
    filter,
    debouncedQuery,
    activeView === 'inbox'
  )

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
    enabled: activeView === 'archived'
  })

  // Xử lý khi click vào cuộc trò chuyện
  const handleChatClick = (id: string) => {
    const params = new URLSearchParams(searchParams.toString())
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

  // Cập nhật refreshKey khi nhận tin nhắn mới
  useEffect(() => {
    if (!socket) return

    const handleReceiveMessage = (message: any) => {
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
      queryClient.invalidateQueries({ queryKey: ['ARCHIVED_CHAT_LIST'] })
    }

    // Lắng nghe các sự kiện liên quan đến tin nhắn
    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, handleReceiveMessage)
    socket.on('MESSAGE_UPDATED', (data) => {
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
      queryClient.invalidateQueries({ queryKey: ['ARCHIVED_CHAT_LIST'] })
    })

    return () => {
      socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE, handleReceiveMessage)
      socket.off('MESSAGE_UPDATED')
    }
  }, [socket, queryClient])

  // Xử lý khi bỏ lưu trữ cuộc trò chuyện
  const handleUnarchive = (chatId: string) => {
    unarchiveChat.mutate(chatId)
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Thanh tìm kiếm và tạo nhóm */}
      <div className='flex items-center gap-2 p-4'>
        <div className='relative flex-1'>
          <Search className='text-muted-foreground absolute top-2.5 left-2 h-4 w-4' />
          <Input
            placeholder={messagesT('searchPlaceholder')}
            value={searchQuery}
            onChange={handleSearchChange}
            className='pl-8'
          />
        </div>
        <CreateGroupChatDialog />
      </div>

      {/* Hiển thị danh sách cuộc trò chuyện dựa trên chế độ xem hiện tại */}
      <div className='h-[calc(100dvh-180px)] overflow-y-auto' id='chatListScrollableDiv'>
        {activeView === 'inbox' ? (
          <InfiniteScroll
            dataLength={items.length || 0}
            next={fetchNextPage}
            hasMore={!!hasNextPage}
            loader={renderChatSkeletons()}
            scrollableTarget='chatListScrollableDiv'
            endMessage={
              <div className='text-muted-foreground p-2 text-center text-xs'>
                {items.length > 0 ? messagesT('noMoreChats') : ''}
              </div>
            }
          >
            <div className='p-2'>
              {isLoading ? (
                renderChatSkeletons()
              ) : isError ? (
                <div className='text-muted-foreground p-4 text-center'>{messagesT('loadError')}</div>
              ) : items.length === 0 ? (
                <div className='text-muted-foreground p-4 text-center'>
                  {searchQuery ? messagesT('noSearchResults') : messagesT('noChats')}
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
          </InfiniteScroll>
        ) : (
          // Hiển thị đã lưu trữ
          <div className='p-2'>
            {archivedChats.isLoading ? (
              renderChatSkeletons()
            ) : archivedChats.isError ? (
              <div className='text-muted-foreground p-4 text-center'>{messagesT('cannotLoadArchivedChats')}</div>
            ) : uniqueArchivedItems.length === 0 ? (
              <div className='text-muted-foreground p-4 text-center'>
                {searchQuery ? messagesT('noSearchResults') : messagesT('noArchivedChats')}
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {uniqueArchivedItems.map((chat) => (
                  <MemoizedConversationItem
                    key={`archived-${chat._id}`}
                    conversation={chat}
                    isActive={chat._id === chatId}
                    onClick={() => handleChatClick(chat._id)}
                    isArchived={true} // Đã được lưu trữ
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
