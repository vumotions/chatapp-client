'use client'

import { format, formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { MessageCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { debounce } from 'lodash'
import InfiniteScroll from 'react-infinite-scroll-component'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { useChatList } from '~/hooks/data/chat.hooks'
import { Link } from '~/i18n/navigation'
import { Input } from './ui/input'
import { Skeleton } from './ui/skeleton'
import { Button } from './ui/button'
import { cn } from '~/lib/utils'
import SOCKET_EVENTS from '~/constants/socket-events'
import { useQueryClient } from '@tanstack/react-query'
import { useSocket } from '~/hooks/use-socket'

function MessagePopover() {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [inputValue, setInputValue] = useState('')
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { socket } = useSocket()

  // Fetch chats using the existing hook with search query
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useChatList(
    'all',
    searchQuery
  )

  // Extract chats from the data
  const chats = useMemo(() => {
    return data?.pages.flatMap((page) => page?.conversations) || []
  }, [data])

  // Create debounced search function
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchQuery(value)
    }, 700),
    []
  )

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    debouncedSearch(value)
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  // Format time
  const formatTime = (date: string) => {
    const now = new Date()
    const messageDate = new Date(date)
    const diffInHours = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return formatDistanceToNow(messageDate, { addSuffix: false, locale: vi })
    } else if (diffInHours < 24) {
      return `${diffInHours} giờ`
    } else if (diffInHours < 48) {
      return 'Hôm qua'
    } else {
      return format(messageDate, 'dd/MM/yyyy', { locale: vi })
    }
  }

  // Check if there are any unread messages
  const hasUnread = useMemo(() => {
    return chats?.some((chat: any) => {
      // Kiểm tra nếu tin nhắn cuối cùng do chính người dùng gửi, coi như đã đọc
      const lastMessageSenderId = chat.lastMessage?.senderId?._id || chat.lastMessage?.senderId;
      const currentUserId = session?.user?._id;
      
      return !chat.read && lastMessageSenderId !== currentUserId;
    });
  }, [chats, session?.user?._id]);

  // Lắng nghe sự kiện tin nhắn đã đọc từ socket
  useEffect(() => {
    if (!socket) return;
    
    const handleMessageRead = (data: { chatId: string; messageIds: string[] }) => {
      // Cập nhật cache để đánh dấu tin nhắn đã đọc
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] });
    };
    
    socket.on(SOCKET_EVENTS.MESSAGE_READ, handleMessageRead);
    
    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_READ, handleMessageRead);
    };
  }, [socket, queryClient]);

  // Get chat name and avatar
  const getChatInfo = (chat: any) => {
    // If it's a group chat
    if (chat.name) {
      return {
        name: chat.name,
        avatar: chat.avatar || 'https://placehold.co/40x40'
      }
    }

    // If it's a private chat, get the other participant
  const currentUserId = session?.user?._id
    const otherParticipant = chat.participants?.find((p: any) => p._id !== currentUserId)

    return {
      name: otherParticipant?.name || 'Unknown',
      avatar: otherParticipant?.avatar || 'https://placehold.co/40x40'
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant='ghost' size='icon' className='bg-accent relative cursor-pointer rounded-full p-2'>
          <MessageCircle className='size-5 text-gray-700 dark:text-gray-300' />
          {hasUnread && <span className='absolute top-0 right-0 h-2 w-2 rounded-full bg-blue-500'></span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-96 p-0' align='end'>
        <div className='border-b p-3'>
          <h3 className='py-2 text-base font-medium'>Đoạn chat</h3>
          <Input placeholder='Tìm kiếm tin nhắn' className='mt-2' value={inputValue} onChange={handleInputChange} />
        </div>

        <div id='messageScrollableDiv' className='h-[50vh] overflow-auto'>
          {isLoading ? (
            // Loading state
            Array(5)
              .fill(0)
              .map((_, index) => (
                <div key={index} className='flex items-start border-b px-4 py-3'>
                  <Skeleton className='h-10 w-10 rounded-full' />
                  <div className='ml-3 flex-1'>
                    <Skeleton className='mb-1 h-4 w-1/2' />
                    <Skeleton className='mb-1 h-3 w-3/4' />
                    <Skeleton className='h-3 w-1/4' />
                  </div>
                </div>
              ))
          ) : isError ? (
            // Error state
            <div className='text-muted-foreground p-4 text-center'>Không thể tải tin nhắn. Vui lòng thử lại sau.</div>
          ) : chats?.length === 0 ? (
            // Empty state
            <div className='text-muted-foreground p-4 text-center'>Bạn chưa có cuộc trò chuyện nào.</div>
          ) : (
            // Chats list with infinite scroll
            <InfiniteScroll
              dataLength={chats.length}
              next={fetchNextPage}
              hasMore={!!hasNextPage}
              loader={
                <div className='p-2 text-center'>
                  <Skeleton className='mx-auto h-10 w-10 rounded-full' />
                </div>
              }
              scrollableTarget='messageScrollableDiv'
              endMessage={
                <div className='text-muted-foreground p-2 text-center text-xs'>Không còn cuộc trò chuyện nào nữa</div>
              }
            >
              {chats?.map((chat: any) => {
                const chatInfo = getChatInfo(chat);
                // Kiểm tra nếu tin nhắn cuối cùng do chính người dùng gửi, coi như đã đọc
                const lastMessageSenderId = chat.lastMessage?.senderId?._id || chat.lastMessage?.senderId;
                const currentUserId = session?.user?._id;
                const isUnread = !chat.read && lastMessageSenderId !== currentUserId;

                return (
                  <Link
                    href={`/messages/${chat._id}`}
                    key={chat._id}
                    className='hover:bg-muted flex cursor-pointer items-start border-b px-4 py-3'
                    onClick={() => setOpen(false)}
                  >
                    <Avatar className='h-10 w-10'>
                      <AvatarImage src={chatInfo.avatar} />
                      <AvatarFallback>{chatInfo.name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className='ml-3 flex-1'>
                      <div className={cn('text-sm', isUnread ? 'font-bold' : 'font-medium')}>{chatInfo.name}</div>
                      <div className={cn(
                        'truncate text-sm', 
                        isUnread ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      )}>
                        {typeof chat.lastMessage === 'string'
                          ? chat.lastMessage
                          : chat.lastMessage?.content || 'Bắt đầu cuộc trò chuyện'}
                      </div>
                      <div className={cn(
                        'text-xs', 
                        isUnread ? 'text-foreground' : 'text-gray-500 dark:text-gray-400'
                      )}>
                        {chat.updatedAt ? formatTime(chat.updatedAt) : ''}
                      </div>
                    </div>
                    {isUnread && <div className='mt-2 ml-2 h-2 w-2 rounded-full bg-blue-500' />}
                  </Link>
                )
              })}
            </InfiniteScroll>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default MessagePopover
