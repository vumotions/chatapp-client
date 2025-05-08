'use client'

import { formatDistanceToNow } from 'date-fns'
import { useParams, useSearchParams } from 'next/navigation'
import { Fragment, useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Skeleton } from '~/components/ui/skeleton'
import { useChatList } from '~/hooks/data/chat.hooks'
import { Link } from '~/i18n/navigation'
import { cn } from '~/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

export function ChatList() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { data, isLoading, isError, fetchNextPage, hasNextPage } = useChatList();
  const chatId = params?.chatId as string;
  
  // Lấy filter từ searchParams
  const filter = searchParams.get('filter') || 'all';

  // Hàm xử lý khi click vào chat
  const handleChatClick = (selectedChatId: string) => {
    // Nếu đang ở chat khác, invalidate query để lấy tin nhắn mới
    if (selectedChatId !== chatId) {
      queryClient.invalidateQueries({ 
        queryKey: ['MESSAGES', selectedChatId] 
      });
      console.log('Invalidating query for chat:', selectedChatId);
    }
  };

  const items = useMemo(() => {
    return data?.pages.flatMap((page) => page?.conversations) || []
  }, [data])
  
  if (isLoading)
    return (
      <div className='px-4'>
        {Array(5)
          .fill(0)
          .map((_, index) => (
            <div key={index} className='flex flex-col items-start gap-2 rounded-lg p-3'>
              <div className='flex w-full flex-col gap-1'>
                <div className='flex items-center'>
                  <div className='flex items-center gap-2'>
                    {/* Skeleton Avatar */}
                    <Skeleton className='h-10 w-10 shrink-0 rounded-full' />
                    <div className='flex w-full flex-col'>
                      {/* Skeleton for Name */}
                      <Skeleton className='mb-1 h-4 w-32' />
                      {/* Skeleton for Last Message */}
                      <Skeleton className='h-3 w-48' />
                    </div>
                  </div>
                  <div className='ml-auto'>
                    {/* Skeleton for Date */}
                    <Skeleton className='h-3 w-16' />
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
    )
  if (isError) return <div>Error loading chat list</div>

  return (
    <ScrollArea className='h-[calc(100vh-120px)]'>
      <div className='flex flex-col gap-2 p-4 pt-0'>
        {items.map((item) => (
          <Link
            href={`/messages/${item._id}`}
            key={item._id}
            onClick={() => handleChatClick(item._id)}
            className={cn(
              'hover:bg-accent flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all',
              {
                'bg-muted': chatId === item._id
              }
            )}
          >
            <div className='flex w-full flex-col gap-1'>
              <div className='flex items-center'>
                <div className='flex items-center gap-2'>
                  <Avatar>
                    {/* Kiểm tra cấu trúc của item để lấy đúng avatar */}
                    <AvatarImage 
                      src={
                        item.avatar || 
                        (item.type === 'PRIVATE' && item.participants?.[0]?.avatar) || 
                        ''
                      } 
                      alt={
                        item.name || 
                        (item.type === 'PRIVATE' && item.participants?.[0]?.name) || 
                        'User'
                      } 
                    />
                    <AvatarFallback>
                      {/* Lấy chữ cái đầu của tên để hiển thị fallback */}
                      {(item.name || 
                        (item.type === 'PRIVATE' && item.participants?.[0]?.name) || 
                        'U')
                        ?.split(' ')
                        .map((chunk: any) => chunk?.[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className='flex items-center gap-2'>
                      {/* Hiển thị tên */}
                      <div className='font-semibold'>
                        {item.name || 
                         (item.type === 'PRIVATE' && item.participants?.[0]?.name) || 
                         'Unknown User'}
                      </div>
                      <div className='text-muted-foreground text-xs font-medium'>
                        {item.type === 'GROUP' && <span>{item.participants?.length || 0} members</span>}
                      </div>
                      {!item.read && <span className='flex h-2 w-2 rounded-full bg-blue-600' />}{' '}
                    </div>
                    <span
                      className={cn('inline-block max-w-[200px] truncate', {
                        'text-muted-foreground': item.read
                      })}
                    >
                      {/* Hiển thị lastMessage */}
                      {typeof item.lastMessage === 'string' 
                        ? item.lastMessage 
                        : item.lastMessage?.content || 'No message'}
                    </span>
                  </div>
                </div>
                <div
                  className={cn(
                    'ml-auto pl-2 text-xs',
                    chatId === item._id ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {formatDistanceToNow(new Date(item.createdAt), {
                    addSuffix: true
                  })}
                </div>
              </div>
            </div>
          </Link>
        ))}
        {/* Nếu còn trang tiếp theo, hiển thị nút load more */}
        {hasNextPage && (
          <button onClick={() => fetchNextPage()} className='mt-4 text-blue-600'>
            Load more
          </button>
        )}
      </div>
    </ScrollArea>
  )
}





