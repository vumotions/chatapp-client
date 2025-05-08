'use client'

import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Bell } from 'lucide-react'
import { useMemo, useState } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { NOTIFICATION_TYPE } from '~/constants/enums'
import { useMarkNotificationAsRead, useNotifications } from '~/hooks/data/notification.hooks'
import { useRouter } from '~/i18n/navigation'
import { cn } from '~/lib/utils'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

function NotificationPopover() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const router = useRouter()

  // Fetch notifications
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications()

  const { mutate: markAsRead } = useMarkNotificationAsRead()

  // Extract notifications from the data
  const notifications = useMemo(() => {
    return data?.pages.flatMap((page) => page?.notifications || []) || []
  }, [data])

  // Handle notification click
  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (notification && notification.read === false) {
      markAsRead(notification._id)
    }

    // Navigate based on notification type
    if (notification?.type === NOTIFICATION_TYPE.FRIEND_REQUEST) {
      router.push('/friends/requests')
    } else if (notification?.type === NOTIFICATION_TYPE.NEW_MESSAGE && notification?.chatId) {
      router.push(`/messages/${notification.chatId}`)
    }

    setOpen(false)
  }

  // Format time
  const formatTime = (date: string) => {
    const now = new Date()
    const notificationDate = new Date(date)
    const diffInHours = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60))
      return `${diffInMinutes} phút`
    } else if (diffInHours < 24) {
      return `${diffInHours} giờ`
    } else {
      return format(notificationDate, 'dd/MM/yyyy', { locale: vi })
    }
  }

  // Filter notifications based on tab
  const filteredNotifications = useMemo(() => {
    return notifications?.filter((notification) => {
      if (!notification) return false;
      if (tab === 'all') return true;
      return notification.read === false;
    }) || []
  }, [notifications, tab])

  // Check if there are any unread notifications
  const hasUnread = useMemo(() => {
    return notifications?.some((notification) => notification && notification.read === false) || false
  }, [notifications])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span className='bg-accent relative cursor-pointer rounded-full p-2'>
          <Bell className='size-5' />
          {hasUnread && <span className='absolute top-0 right-0 h-2 w-2 rounded-full bg-blue-500'></span>}
        </span>
      </PopoverTrigger>
      <PopoverContent className='w-96 p-0' align='end'>
        <div className='flex items-center justify-between border-b px-4 py-3'>
          <h3 className='text-sm font-medium'>Thông báo</h3>
          <div className='space-x-2 text-sm'>
            <Button
              variant='outline'
              onClick={() => setTab('all')}
              className={cn('rounded-full !bg-transparent px-3 py-1 text-sm', {
                '!bg-muted': tab === 'all'
              })}
            >
              Tất cả
            </Button>
            <Button
              variant='outline'
              onClick={() => setTab('unread')}
              className={cn('rounded-full !bg-transparent px-3 py-1 text-sm', {
                '!bg-muted': tab === 'unread'
              })}
            >
              Chưa đọc
            </Button>
          </div>
        </div>

        <div id='notificationScrollableDiv' className='h-[70vh] overflow-auto'>
          {isLoading ? (
            // Loading state
            Array(5)
              .fill(0)
              .map((_, index) => (
                <div key={index} className='flex items-start px-4 py-3'>
                  <Skeleton className='h-10 w-10 rounded-full' />
                  <div className='ml-3 flex-1'>
                    <Skeleton className='mb-2 h-4 w-3/4' />
                    <Skeleton className='h-3 w-1/4' />
                  </div>
                </div>
              ))
          ) : isError ? (
            // Error state
            <div className='text-muted-foreground p-4 text-center'>Không thể tải thông báo. Vui lòng thử lại sau.</div>
          ) : filteredNotifications?.length === 0 ? (
            // Empty state
            <div className='text-muted-foreground p-4 text-center'>
              {tab === 'all' ? 'Bạn chưa có thông báo nào.' : 'Không có thông báo chưa đọc.'}
            </div>
          ) : (
            // Notifications list with infinite scroll
            <InfiniteScroll
              dataLength={filteredNotifications.length}
              next={fetchNextPage}
              hasMore={!!hasNextPage}
              loader={
                <div className='p-2 text-center'>
                  <Skeleton className='mx-auto h-10 w-10 rounded-full' />
                </div>
              }
              scrollableTarget='notificationScrollableDiv'
              endMessage={
                <div className='text-muted-foreground p-2 text-center text-xs'>Không còn thông báo nào nữa</div>
              }
            >
              {filteredNotifications?.map((item: any) => (
                <div
                  key={item._id}
                  className={cn('hover:bg-muted flex cursor-pointer items-start px-4 py-3 transition', {
                    'bg-muted/50': !item.read
                  })}
                  onClick={() => handleNotificationClick(item)}
                >
                  <Avatar className='h-10 w-10'>
                    <AvatarImage src={item.senderId?.avatar || ''} />
                    <AvatarFallback>{item.senderId?.name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div className='ml-3 flex-1'>
                    <p className='text-muted-foreground text-sm'>{getNotificationContent(item)}</p>
                    <span className='text-xs text-gray-500 dark:text-gray-400'>{formatTime(item.createdAt)}</span>
                  </div>
                  {!item.read && <div className='mt-2 h-2 w-2 rounded-full bg-blue-500' />}
                </div>
              ))}
            </InfiniteScroll>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Helper function to get notification content based on type
function getNotificationContent(notification: any) {
  const { type, senderId } = notification
  const senderName = senderId?.name || 'Ai đó'

  switch (type) {
    case NOTIFICATION_TYPE.FRIEND_REQUEST:
      return `${senderName} đã gửi cho bạn lời mời kết bạn`
    case NOTIFICATION_TYPE.FRIEND_ACCEPTED:
      return `${senderName} đã chấp nhận lời mời kết bạn của bạn`
    case NOTIFICATION_TYPE.NEW_MESSAGE:
      return `${senderName} đã gửi cho bạn một tin nhắn mới`
    default:
      return 'Bạn có một thông báo mới'
  }
}

export default NotificationPopover
