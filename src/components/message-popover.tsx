'use client'

import { MessageCircle } from 'lucide-react'
import { useState, useMemo } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useSession } from 'next-auth/react'
import InfiniteScroll from 'react-infinite-scroll-component'

import { Avatar, AvatarImage, AvatarFallback } from '~/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { cn } from '~/lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Skeleton } from './ui/skeleton'
import { Link } from '~/i18n/navigation'
import { useChatList } from '~/hooks/data/chat.hooks'

function MessagePopover() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'inbox' | 'community'>('inbox')
  const [searchQuery, setSearchQuery] = useState('')
  const { data: session } = useSession()
  
  // Fetch chats using the existing hook
  const { 
    data, 
    isLoading, 
    isError, 
    fetchNextPage, 
    hasNextPage,
    isFetchingNextPage 
  } = useChatList()
  
  // Extract chats from the data
  const chats = useMemo(() => {
    return data?.pages.flatMap((page) => page?.conversations) || []
  }, [data])

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

  // Filter chats based on search query
  const filteredChats = useMemo(() => {
    return chats?.filter((chat: any) => {
      if (!searchQuery) return true
      
      // For group chats, search in name
      if (chat.name) {
        return chat.name.toLowerCase().includes(searchQuery.toLowerCase())
      }
      
      // For private chats, search in participant names
      return chat.participants?.some((participant: any) => 
        participant.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })
  }, [chats, searchQuery])

  // Check if there are any unread messages
  const hasUnread = useMemo(() => {
    return chats?.some((chat: any) => !chat.read)
  }, [chats])

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
        <span className='bg-accent relative cursor-pointer rounded-full p-2'>
          <MessageCircle className='size-5 text-gray-700 dark:text-gray-300' />
          {hasUnread && (
            <span className='absolute top-0 right-0 h-2 w-2 rounded-full bg-blue-500'></span>
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent className='w-96 p-0' align='end'>
        <div className='border-b p-3'>
          <h3 className='py-2 text-base font-medium'>Đoạn chat</h3>
          <Input 
            placeholder='Tìm kiếm trên Messenger' 
            className='mt-2' 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className='mt-3 flex space-x-2'>
            <Button
              variant='outline'
              onClick={() => setTab('inbox')}
              className={cn('rounded-full !bg-transparent px-3 py-1 text-sm', {
                '!bg-muted': tab === 'inbox'
              })}
            >
              Hộp thư
            </Button>
            <Button
              variant='outline'
              onClick={() => setTab('community')}
              className={cn('rounded-full !bg-transparent px-3 py-1 text-sm', {
                '!bg-muted': tab === 'community'
              })}
            >
              Cộng đồng
            </Button>
          </div>
        </div>

        <div id="messageScrollableDiv" className='h-[50vh] overflow-auto'>
          {isLoading ? (
            // Loading state
            Array(5)
              .fill(0)
              .map((_, index) => (
                <div key={index} className='flex items-start border-b px-4 py-3'>
                  <Skeleton className='h-10 w-10 rounded-full' />
                  <div className='ml-3 flex-1'>
                    <Skeleton className='h-4 w-1/2 mb-1' />
                    <Skeleton className='h-3 w-3/4 mb-1' />
                    <Skeleton className='h-3 w-1/4' />
                  </div>
                </div>
              ))
          ) : isError ? (
            // Error state
            <div className='p-4 text-center text-muted-foreground'>
              Không thể tải tin nhắn. Vui lòng thử lại sau.
            </div>
          ) : filteredChats?.length === 0 ? (
            // Empty state
            <div className='p-4 text-center text-muted-foreground'>
              {searchQuery ? 'Không tìm thấy kết quả phù hợp.' : 'Bạn chưa có cuộc trò chuyện nào.'}
            </div>
          ) : (
            // Chats list with infinite scroll
            <InfiniteScroll
              dataLength={filteredChats.length}
              next={fetchNextPage}
              hasMore={!!hasNextPage}
              loader={
                <div className='p-2 text-center'>
                  <Skeleton className='h-10 w-10 rounded-full mx-auto' />
                </div>
              }
              scrollableTarget="messageScrollableDiv"
              endMessage={
                <div className='p-2 text-center text-xs text-muted-foreground'>
                  Không còn cuộc trò chuyện nào nữa
                </div>
              }
            >
              {filteredChats?.map((chat: any) => {
                const chatInfo = getChatInfo(chat)
                
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
                      <div className='text-sm font-medium'>{chatInfo.name}</div>
                      <div className='text-muted-foreground truncate text-sm'>
                        {typeof chat.lastMessage === 'string' 
                          ? chat.lastMessage 
                          : chat.lastMessage?.content || 'Bắt đầu cuộc trò chuyện'}
                      </div>
                      <div className='text-xs text-gray-500 dark:text-gray-400'>
                        {chat.updatedAt ? formatTime(chat.updatedAt) : ''}
                      </div>
                    </div>
                    {!chat.read && <div className='mt-2 ml-2 h-2 w-2 rounded-full bg-blue-500' />}
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
