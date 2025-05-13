'use client'

import debounce from 'lodash/debounce'
import { Loader2, MessageSquare, Search, User } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Fragment, useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button, buttonVariants } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '~/components/ui/hover-card'
import { Input } from '~/components/ui/input'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Skeleton } from '~/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import SOCKET_EVENTS from '~/constants/socket-events'
import { useStartConversationMutation } from '~/hooks/data/chat.hooks'
import { useFriendsQuery } from '~/hooks/data/friends.hook'
import useMediaQuery from '~/hooks/use-media-query'
import { useSocket } from '~/hooks/use-socket'
import { Link } from '~/i18n/navigation'
import { cn } from '~/lib/utils'

// Skeleton component cho item bạn bè
function FriendItemSkeleton() {
  return (
    <div className='flex items-center gap-2'>
      <div className='block lg:hidden'>
        <div className='relative flex cursor-pointer flex-col items-center'>
          <Skeleton className='size-12 rounded-full' />
          <Skeleton className='absolute right-1 bottom-1 h-3 w-3 rounded-full' />
        </div>
      </div>
      <div className='hidden items-center gap-2 lg:flex'>
        <div className='relative'>
          <Skeleton className='size-10 rounded-full' />
          <Skeleton className='absolute right-1 bottom-1 h-3 w-3 rounded-full' />
        </div>
        <Skeleton className='h-5 w-24' />
      </div>
    </div>
  )
}

export default function RightSidebarFriendList() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { socket } = useSocket()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  // Sử dụng useTransition để theo dõi trạng thái chuyển trang
  const [isPending, startTransition] = useTransition()
  const isMobile = useMediaQuery('(max-width: 768px)')

  const isLoading = status === 'loading'

  // State để lưu trạng thái online của bạn bè
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  // State để lưu thời gian hoạt động gần nhất của bạn bè
  const [lastActiveMap, setLastActiveMap] = useState<Map<string, string>>(new Map())
  // State để theo dõi ID của bạn bè đang trong quá trình xử lý
  const [processingFriendId, setProcessingFriendId] = useState<string | null>(null)
  // State để theo dõi ID của bạn bè đang trong quá trình xem profile
  const [processingProfileId, setProcessingProfileId] = useState<string | null>(null)

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

  // Lấy danh sách bạn bè với tìm kiếm từ server
  const { data: friends, isLoading: isLoadingFriends } = useFriendsQuery(debouncedQuery)

  // Khởi tạo mutation để bắt đầu cuộc trò chuyện
  const startConversation = useStartConversationMutation()

  // Sắp xếp bạn bè: online lên trước, offline xuống dưới
  const sortedFriends = useMemo(() => {
    if (!friends) return []

    return [...friends].sort((a, b) => {
      const aOnline = onlineUsers.has(a._id)
      const bOnline = onlineUsers.has(b._id)

      if (aOnline && !bOnline) return -1
      if (!aOnline && bOnline) return 1

      // Nếu cùng trạng thái online/offline, sắp xếp theo tên
      return a.name.localeCompare(b.name)
    })
  }, [friends, onlineUsers])

  // Sử dụng socket để lấy trạng thái online
  useEffect(() => {
    if (!socket || !friends || !friends.length) return

    // Kiểm tra trạng thái online ban đầu cho tất cả bạn bè
    friends.forEach((friend) => {
      socket.emit(SOCKET_EVENTS.CHECK_ONLINE, friend._id, (isUserOnline: boolean, lastActiveTime: string) => {
        if (isUserOnline) {
          setOnlineUsers((prev) => new Set([...prev, friend._id]))
        } else if (lastActiveTime && lastActiveTime !== 'never') {
          setLastActiveMap((prev) => new Map(prev.set(friend._id, lastActiveTime)))
        }
      })
    })

    // Lắng nghe sự kiện khi có người online
    const handleUserOnline = (userId: string) => {
      setOnlineUsers((prev) => new Set([...prev, userId]))
      // Khi user online, xóa khỏi lastActiveMap nếu có
      setLastActiveMap((prev) => {
        const newMap = new Map(prev)
        newMap.delete(userId)
        return newMap
      })
    }

    // Lắng nghe sự kiện khi có người offline
    const handleUserOffline = (userId: string, lastActive: string) => {
      setOnlineUsers((prev) => {
        const newSet = new Set([...prev])
        newSet.delete(userId)
        return newSet
      })
      // Lưu thời gian hoạt động gần nhất
      if (lastActive) {
        setLastActiveMap((prev) => new Map(prev.set(userId, lastActive)))
      }
    }

    // Đăng ký lắng nghe sự kiện
    socket.on(SOCKET_EVENTS.USER_ONLINE, handleUserOnline)
    socket.on(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline)

    // Cleanup khi unmount
    return () => {
      socket.off(SOCKET_EVENTS.USER_ONLINE, handleUserOnline)
      socket.off(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline)
    }
  }, [socket, friends])

  // Kiểm tra trạng thái online của bạn
  const isOnline = (userId: string) => {
    return onlineUsers.has(userId)
  }

  // Lấy thời gian hoạt động gần nhất
  const getLastActive = (userId: string) => {
    return lastActiveMap.get(userId)
  }

  // Xử lý khi click vào bạn bè để bắt đầu chat
  const handleStartChat = async (friendId: string) => {
    // Nếu đang xử lý cho bạn bè này, không làm gì cả
    if (processingFriendId === friendId || isPending) return

    // Đánh dấu đang xử lý cho bạn bè này
    setProcessingFriendId(friendId)

    try {
      const response = await startConversation.mutateAsync(friendId)

      // Sử dụng startTransition để đánh dấu chuyển trang
      startTransition(() => {
        router.push(`/messages/${response.data.data._id}`)
      })
    } catch (error) {
      console.error('Failed to start conversation:', error)
      // Reset trạng thái xử lý nếu có lỗi
      setProcessingFriendId(null)
    }
  }

  // Xử lý khi click vào nút Profile
  const handleViewProfile = (friendId: string, username: string) => {
    // Nếu đang trong quá trình chuyển trang, không làm gì cả
    if (isPending || processingProfileId === friendId) return

    // Đánh dấu đang xử lý cho bạn bè này
    setProcessingProfileId(friendId)

    // Sử dụng startTransition để đánh dấu chuyển trang
    startTransition(() => {
      router.push(`/profile/${username}`)
    })
  }

  // Format thời gian hoạt động gần nhất
  const formatLastActive = (lastActiveTime: string) => {
    if (!lastActiveTime) return 'Đang ngoài tuyến'

    const lastActive = new Date(lastActiveTime)
    const now = new Date()
    const diffMs = now.getTime() - lastActive.getTime()

    // Nếu < 1 phút
    if (diffMs < 60000) {
      return 'Vừa mới truy cập'
    }

    // Nếu < 1 giờ
    if (diffMs < 3600000) {
      const minutes = Math.floor(diffMs / 60000)
      return `Hoạt động ${minutes} phút trước`
    }

    // Nếu < 24 giờ
    if (diffMs < 86400000) {
      const hours = Math.floor(diffMs / 3600000)
      return `Hoạt động ${hours} giờ trước`
    }

    // Nếu >= 24 giờ
    const days = Math.floor(diffMs / 86400000)
    return `Hoạt động ${days} ngày trước`
  }

  return (
    <div
      className={cn('sticky top-0 h-fit w-fit lg:w-[250px]', {
        'hidden lg:flex': !session,
        hidden: (isMobile && !sortedFriends) || (isMobile && sortedFriends.length === 0)
      })}
    >
      <Card>
        <CardContent className='px-2 lg:pr-2 lg:pl-4'>
          {isLoading ? (
            <div className='space-y-4 p-2'>
              <Skeleton className='h-6 w-32' />
              <Skeleton className='h-8 w-full' />
              <div className='space-y-3'>
                {Array(5)
                  .fill(0)
                  .map((_, index) => (
                    <FriendItemSkeleton key={index} />
                  ))}
              </div>
            </div>
          ) : session ? (
            <Fragment>
              <h4 className='mb-2 hidden font-semibold lg:block'>Người liên hệ</h4>

              {/* Thêm thanh tìm kiếm - chỉ hiển thị trên desktop */}
              <div className='mb-3 hidden px-1 lg:block'>
                <div className='relative'>
                  <Search className='text-muted-foreground absolute top-1/2 left-2 size-4 -translate-y-1/2' />
                  <Input
                    placeholder='Tìm bạn bè...'
                    className='h-8 pl-8 text-sm'
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                </div>
              </div>

              <ScrollArea className='h-[70vh] lg:pr-5'>
                <div className='space-y-2'>
                  {isLoadingFriends ? (
                    // Hiển thị skeleton khi đang tải
                    Array(8)
                      .fill(0)
                      .map((_, index) => <FriendItemSkeleton key={index} />)
                  ) : sortedFriends.length === 0 ? (
                    // Hiển thị thông báo khi không có bạn bè
                    <div className='text-muted-foreground hidden py-4 text-center text-sm lg:block'>
                      {searchQuery ? 'Không tìm thấy bạn bè' : 'Bạn chưa có người liên hệ nào'}
                    </div>
                  ) : (
                    // Hiển thị danh sách bạn bè
                    sortedFriends.map((friend) => (
                      <div key={friend._id} className='flex cursor-pointer items-center gap-2'>
                        {/* Mobile: chỉ hiện avatar, hover mới hiện tooltip */}
                        <div className='block p-1 lg:hidden'>
                          <Tooltip>
                            <TooltipTrigger asChild className='rounded-full'>
                              <div
                                className='relative flex cursor-pointer flex-col items-center'
                                onClick={() => {
                                  if (processingFriendId === friend._id) return
                                  handleStartChat(friend._id)
                                }}
                              >
                                {processingFriendId === friend._id ? (
                                  <div className='relative flex size-12 items-center justify-center'>
                                    <Avatar className='size-12 opacity-50'>
                                      <AvatarImage src={friend.avatar} alt={friend.name} />
                                      <AvatarFallback>{friend.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <Loader2 className='absolute h-5 w-5 animate-spin' />
                                  </div>
                                ) : (
                                  <Avatar className='size-12'>
                                    <AvatarImage src={friend.avatar} alt={friend.name} />
                                    <AvatarFallback>{friend.name?.[0]}</AvatarFallback>
                                  </Avatar>
                                )}
                                {/* Badge online */}
                                {isOnline(friend._id) && processingFriendId !== friend._id && (
                                  <span className='absolute right-0 bottom-0 block h-3 w-3 rounded-full border-2 border-white bg-green-500' />
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side='left' className='text-center'>
                              <div>{friend.name}</div>
                              {processingFriendId === friend._id ? (
                                <div className='text-xs'>Đang xử lý...</div>
                              ) : isOnline(friend._id) ? (
                                <div className='text-xs text-green-500'>Đang hoạt động</div>
                              ) : getLastActive(friend._id) ? (
                                <div className='text-muted-foreground text-xs'>
                                  {formatLastActive(getLastActive(friend._id)!)}
                                </div>
                              ) : null}
                              <div className='mt-2 flex gap-2'>
                                <Button
                                  variant='secondary'
                                  size='sm'
                                  className='h-7 cursor-pointer px-2'
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (processingProfileId === friend._id) return
                                    handleViewProfile(friend._id, friend.username || friend._id)
                                  }}
                                  disabled={isPending || processingProfileId === friend._id}
                                >
                                  {processingProfileId === friend._id ? (
                                    <Loader2 className='mr-1 h-3 w-3 animate-spin' />
                                  ) : (
                                    <User className='mr-1 h-3 w-3' />
                                  )}
                                  <span className='text-xs'>Trang cá nhân</span>
                                </Button>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        {/* Desktop: hiện avatar kèm tên, sử dụng HoverCard */}
                        <div className='hidden w-full lg:block'>
                          <HoverCard openDelay={300} closeDelay={200}>
                            <HoverCardTrigger asChild>
                              <div className='flex w-full items-center gap-2 p-2'>
                                <div className='relative'>
                                  <Avatar className='size-10'>
                                    <AvatarImage src={friend.avatar} alt={friend.name} />
                                    <AvatarFallback>{friend.name?.[0]}</AvatarFallback>
                                  </Avatar>
                                  {/* Badge online */}
                                  {isOnline(friend._id) && (
                                    <span className='absolute right-0 bottom-0 block h-3 w-3 rounded-full border-2 border-white bg-green-500' />
                                  )}
                                </div>
                                <div className='flex flex-col'>
                                  <span className='truncate text-base'>{friend.name}</span>
                                  {!isOnline(friend._id) && getLastActive(friend._id) && (
                                    <span className='text-muted-foreground text-xs'>
                                      {formatLastActive(getLastActive(friend._id)!)}
                                    </span>
                                  )}
                                  {isOnline(friend._id) && (
                                    <span className='text-xs text-green-500'>Đang hoạt động</span>
                                  )}
                                </div>
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent className='w-72 p-4'>
                              <div className='flex flex-col items-center gap-3'>
                                <Avatar className='size-16'>
                                  <AvatarImage src={friend.avatar} alt={friend.name} />
                                  <AvatarFallback>{friend.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className='text-center'>
                                  <h4 className='text-lg font-medium'>{friend.name}</h4>
                                  <p className='text-muted-foreground text-sm'>
                                    {isOnline(friend._id)
                                      ? 'Đang hoạt động'
                                      : getLastActive(friend._id)
                                        ? formatLastActive(getLastActive(friend._id)!)
                                        : 'Đang ngoại tuyến'}
                                  </p>
                                </div>
                                <div className='mt-2 flex w-full gap-2'>
                                  <Button
                                    variant='outline'
                                    size='icon'
                                    className='flex-1'
                                    onClick={() => handleViewProfile(friend._id, friend.username || friend._id)}
                                    disabled={isPending || processingProfileId === friend._id}
                                  >
                                    {processingProfileId === friend._id ? (
                                      <Loader2 className='size-4 animate-spin' />
                                    ) : (
                                      <User className='size-4' />
                                    )}
                                    <span className='sr-only'>Trang cá nhân</span>
                                  </Button>
                                  <Button
                                    variant='default'
                                    size='icon'
                                    className='flex-1'
                                    onClick={() => handleStartChat(friend._id)}
                                    disabled={isPending || processingFriendId === friend._id}
                                  >
                                    {processingFriendId === friend._id ? (
                                      <Loader2 className='size-4 animate-spin' />
                                    ) : (
                                      <MessageSquare className='size-4' />
                                    )}
                                    <span className='sr-only'>Nhắn tin</span>
                                  </Button>
                                </div>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Fragment>
          ) : (
            <div className='flex h-full flex-col items-center justify-center p-4'>
              <div className='text-muted-foreground mb-4 text-center'>
                Đăng nhập để xem bạn bè, nhắn tin và kết nối với mọi người trên Teleface!
              </div>
              <Link
                className={cn(
                  buttonVariants({
                    variant: 'default'
                  })
                )}
                href='/auth/login'
              >
                Đăng nhập
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
