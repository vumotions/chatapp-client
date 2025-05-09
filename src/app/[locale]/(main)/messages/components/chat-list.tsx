'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'

import { debounce } from 'lodash'
import { useChatList } from '~/hooks/data/chat.hooks'
import { cn } from '~/lib/utils'
import { useSession } from 'next-auth/react'

export function ChatList() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const chatId = params?.chatId as string
  const [inputValue, setInputValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Lấy filter từ URL hoặc mặc định là 'all'
  const currentFilter = searchParams.get('filter') || 'all'

  // Tạo hàm debounced để cập nhật searchQuery
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetSearchQuery = useCallback(
    debounce((value: string) => {
      setSearchQuery(value)
    }, 700),
    []
  )

  // Xử lý khi input thay đổi
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    debouncedSetSearchQuery(value)
  }

  // Cleanup debounce khi component unmount
  useEffect(() => {
    return () => {
      debouncedSetSearchQuery.cancel()
    }
  }, [debouncedSetSearchQuery])

  // Sử dụng filter từ URL và searchQuery để fetch dữ liệu
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetching } = useChatList(currentFilter, searchQuery)

  // Hàm xử lý khi click vào chat
  const handleChatClick = (selectedChatId: string) => {
    // Nếu đang ở chat khác, invalidate query để lấy tin nhắn mới
    if (selectedChatId !== chatId) {
      queryClient.invalidateQueries({
        queryKey: ['MESSAGES', selectedChatId]
      })
    }

    // Giữ nguyên filter khi chuyển đến chat cụ thể
    const newParams = new URLSearchParams(searchParams.toString())
    router.push(`/messages/${selectedChatId}?${newParams.toString()}`)
  }

  const items = useMemo(() => {
    return data?.pages.flatMap((page) => page?.conversations) || []
  }, [data])

  // Render chat skeleton
  const renderChatSkeletons = () => {
    return Array(5)
      .fill(0)
      .map((_, index) => (
        <div key={`skeleton-${index}`} className='flex items-center gap-3 rounded-lg p-3'>
          <Skeleton className='h-10 w-10 rounded-full' />
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-4 w-1/3' />
            <Skeleton className='h-3 w-2/3' />
          </div>
        </div>
      ))
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Thêm thanh tìm kiếm */}
      <div className='p-2'>
        <div className='relative'>
          <Search className='text-muted-foreground absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2' />
          <Input placeholder='Tìm kiếm tin nhắn' className='pl-8' value={inputValue} onChange={handleInputChange} />
        </div>
      </div>

      {/* Phần hiển thị danh sách chat */}
      <div className='flex-1 overflow-auto p-2'>
        {isLoading ? (
          renderChatSkeletons()
        ) : isError ? (
          <div className='text-muted-foreground p-4 text-center'>Không thể tải tin nhắn. Vui lòng thử lại sau.</div>
        ) : items.length === 0 ? (
          <div className='text-muted-foreground p-4 text-center'>
            {searchQuery
              ? 'Không tìm thấy kết quả phù hợp.'
              : currentFilter === 'all'
                ? 'Bạn chưa có cuộc trò chuyện nào.'
                : 'Không có tin nhắn chưa đọc.'}
          </div>
        ) : (
          items.map((chat) => {
            // Xác định avatar và tên hiển thị trực tiếp
            const displayName = chat.type !== 'PRIVATE' 
              ? chat.name 
              : chat.participants?.find((p: any) => p._id !== session?.user?._id)?.name || 'Người dùng';
            
            const avatarSrc = chat.type !== 'PRIVATE'
              ? chat.avatar
              : chat.participants?.find((p: any) => p._id !== session?.user?._id)?.avatar;
            
            return (
              <div
                key={chat._id}
                className={cn('hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg p-3', {
                  'bg-muted': chat._id === chatId
                })}
                onClick={() => handleChatClick(chat._id)}
              >
                <Avatar className='h-10 w-10'>
                  <AvatarImage
                    src={avatarSrc || undefined}
                    alt={displayName}
                  />
                  <AvatarFallback>{displayName?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div className='flex-1 overflow-hidden'>
                  <div className='flex items-center justify-between'>
                    <p className='truncate font-medium'>{displayName}</p>
                    {chat.lastMessage && (
                      <span className='text-muted-foreground text-xs'>
                        {new Date(chat.lastMessage.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                  {chat.lastMessage && (
                    <p className='text-muted-foreground truncate text-sm'>
                      {chat.lastMessage.senderId._id === session?.user?._id
                        ? 'Bạn: '
                        : ''}
                      {chat.lastMessage.content}
                    </p>
                  )}
                </div>
                {!chat.read && <div className='h-2 w-2 rounded-full bg-blue-500' />}
              </div>
            );
          })
        )}
      </div>
    </div>
  )
}








