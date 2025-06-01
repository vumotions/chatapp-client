'use client'

import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Bell, Check, MoreVertical, Trash } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { FRIEND_REQUEST_STATUS, NOTIFICATION_TYPE } from '~/constants/enums'
import SOCKET_EVENTS from '~/constants/socket-events'
import { useAcceptFriendRequestMutation, useRejectFriendRequestMutation } from '~/hooks/data/friends.hook'
import {
  useDeleteAllNotificationsMutation,
  useDeleteNotificationMutation,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications
} from '~/hooks/data/notification.hooks'
import { useSocket } from '~/hooks/use-socket'
import { useRouter } from '~/i18n/navigation'
import { cn } from '~/lib/utils'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'
import { useNotificationsTranslation } from '~/hooks/use-translations'

function NotificationPopover() {
  const [open, setOpen] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const [isAccepting, setIsAccepting] = useState<string | null>(null)
  const [isRejecting, setIsRejecting] = useState<string | null>(null)
  const [processedIds, setProcessedIds] = useState<string[]>([])
  const router = useRouter()
  const queryClient = useQueryClient()
  const notificationsT = useNotificationsTranslation()

  // Thêm useEffect để lấy processedIds từ localStorage khi component mount
  useEffect(() => {
    const savedProcessedIds = localStorage.getItem('processedNotificationIds')
    if (savedProcessedIds) {
      setProcessedIds(JSON.parse(savedProcessedIds))
    }
  }, [])

  // Cập nhật localStorage khi processedIds thay đổi
  useEffect(() => {
    if (processedIds.length > 0) {
      localStorage.setItem('processedNotificationIds', JSON.stringify(processedIds))
    }
  }, [processedIds])

  // Fetch notifications with filter
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useNotifications(tab)

  const { mutate: markAsRead } = useMarkNotificationAsRead()
  const { mutate: markAllAsRead } = useMarkAllNotificationsAsRead()
  const { mutate: deleteNotification } = useDeleteNotificationMutation()
  const { mutate: deleteAllNotifications } = useDeleteAllNotificationsMutation()
  const { mutate: acceptFriendRequest } = useAcceptFriendRequestMutation()
  const { mutate: rejectFriendRequest } = useRejectFriendRequestMutation()

  // Extract notifications from the data
  const notifications = useMemo(() => {
    return data?.pages.flatMap((page) => page?.notifications || []) || []
  }, [data])

  // Filter out NEW_MESSAGE notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => notification.type !== NOTIFICATION_TYPE.NEW_MESSAGE) || []
  }, [notifications])

  // Handle notification click
  const handleNotificationClick = async (notification: any) => {
    try {
      // Đánh dấu thông báo đã đọc
      await markAsRead(notification._id)

      // Đóng popover
      setOpen(false)

      // Xử lý chuyển hướng dựa trên loại thông báo
      switch (notification.type) {
        case NOTIFICATION_TYPE.FRIEND_REQUEST:
          router.push('/friends/requests')
          break
        case NOTIFICATION_TYPE.FRIEND_ACCEPTED:
          router.push('/friends')
          break
        case NOTIFICATION_TYPE.NEW_COMMENT:
          // Chuyển hướng đến bài viết có bình luận
          if (notification.relatedId) {
            router.push(`/posts/${notification.relatedId}`)
          }
          break
        default:
          console.log('Unhandled notification type:', notification.type)
      }
    } catch (error) {
      console.error('Error handling notification click:', error)
    }
  }

  // Handle delete notification
  const handleDeleteNotification = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation() // Prevent triggering the notification click
    deleteNotification(notificationId)
  }

  // Handle delete all notifications
  const handleDeleteAllNotifications = () => {
    deleteAllNotifications()
    setOptionsOpen(false)
  }

  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    console.log('Attempting to mark all notifications as read')
    markAllAsRead()
    setOptionsOpen(false)
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

  // Check if there are any unread notifications (excluding NEW_MESSAGE)
  const hasUnread = useMemo(() => {
    return (
      notifications?.some(
        (notification) =>
          notification && notification.read === false && notification.type !== NOTIFICATION_TYPE.NEW_MESSAGE
      ) || false
    )
  }, [notifications])

  // Thêm useEffect để lắng nghe sự kiện socket
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket) return

    const handleNewNotification = (notification: any) => {
      console.log('NotificationPopover received notification:', notification)

      // Xử lý cập nhật thông báo
      if (notification.isUpdate) {
        // Nếu là cập nhật tất cả thông báo đã đọc
        if (notification.allRead) {
          // Gọi refetch để lấy dữ liệu mới nhất
          refetch()
          return
        }

        // Cập nhật một thông báo cụ thể
        queryClient.setQueryData(['NOTIFICATIONS', tab], (oldData: any) => {
          if (!oldData) return oldData

          // Cập nhật thông báo trong tất cả các trang
          const updatedPages = oldData.pages.map((page: any) => {
            const updatedNotifications = page.notifications.map((item: any) => {
              if (item._id === notification._id) {
                return { ...item, ...notification }
              }
              return item
            })

            return {
              ...page,
              notifications: updatedNotifications
            }
          })

          return {
            ...oldData,
            pages: updatedPages
          }
        })
      }
      // Xử lý thông báo mới
      else if (notification.type !== NOTIFICATION_TYPE.NEW_MESSAGE) {
        // Thêm thông báo mới vào đầu danh sách
        queryClient.setQueryData(['NOTIFICATIONS', tab], (oldData: any) => {
          if (!oldData) {
            return {
              pages: [{ notifications: [notification], hasMore: true }],
              pageParams: [1]
            }
          }

          // Thêm thông báo mới vào trang đầu tiên
          const updatedPages = [...oldData.pages]
          if (updatedPages.length > 0) {
            updatedPages[0] = {
              ...updatedPages[0],
              notifications: [notification, ...(updatedPages[0].notifications || [])]
            }
          }

          return {
            ...oldData,
            pages: updatedPages
          }
        })

        // Nếu popover đang mở, refetch để đảm bảo dữ liệu mới nhất
        if (open) {
          refetch()
        }
      }
    }

    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification)

    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification)
    }
  }, [socket, open, tab, queryClient, refetch])

  // Xử lý chấp nhận lời mời kết bạn
  const handleAcceptFriendRequest = (e: React.MouseEvent, notificationId: string, senderId: string) => {
    e.stopPropagation()
    setIsAccepting(notificationId)

    acceptFriendRequest(senderId, {
      onSuccess: () => {
        // Thêm ID vào danh sách đã xử lý
        setProcessedIds((prev) => [...prev, notificationId])
        // Cập nhật lại danh sách bạn bè
        queryClient.invalidateQueries({ queryKey: ['FRIENDS'] })
        // Cập nhật lại danh sách gợi ý bạn bè
        queryClient.invalidateQueries({ queryKey: ['FRIEND_SUGGESTIONS'] })
        // Cập nhật trạng thái bạn bè
        queryClient.invalidateQueries({ queryKey: ['FRIEND_STATUS'] })
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi chấp nhận lời mời')
      },
      onSettled: () => {
        setIsAccepting(null)
      }
    })
  }

  // Xử lý từ chối lời mời kết bạn
  const handleRejectFriendRequest = (e: React.MouseEvent, notificationId: string, senderId: string) => {
    e.stopPropagation()
    setIsRejecting(notificationId)

    rejectFriendRequest(senderId, {
      onSuccess: () => {
        // Thêm ID vào danh sách đã xử lý
        setProcessedIds((prev) => [...prev, notificationId])
        toast.success('Đã từ chối lời mời kết bạn')
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi từ chối lời mời')
      },
      onSettled: () => {
        setIsRejecting(null)
      }
    })
  }

  // Hàm lấy nội dung thông báo
  const getNotificationContent = (notification: any) => {
    // Xác định tên người gửi
    let senderName = 'Ai đó'

    if (notification.senderId && typeof notification.senderId === 'object') {
      senderName = notification.senderId.name || 'Người dùng'
    }

    switch (notification.type) {
      case NOTIFICATION_TYPE.FRIEND_REQUEST:
        return `${senderName} đã gửi cho bạn lời mời kết bạn`
      case NOTIFICATION_TYPE.FRIEND_ACCEPTED:
        return `${senderName} đã chấp nhận lời mời kết bạn của bạn`
      case NOTIFICATION_TYPE.JOIN_REQUEST:
        if (notification.metadata?.chatName) {
          if (notification.metadata.invitedUsers && notification.metadata.invitedUsers.length > 0) {
            return `${senderName} đã mời ${notification.metadata.invitedUsers.length} người vào nhóm "${notification.metadata.chatName}"`
          }
          return `${senderName} muốn tham gia nhóm "${notification.metadata.chatName}"`
        }
        return `${senderName} muốn tham gia nhóm của bạn`
      case NOTIFICATION_TYPE.NEW_MESSAGE:
        if (notification.metadata?.chatName) {
          return `${senderName} đã gửi tin nhắn trong nhóm "${notification.metadata.chatName}"`
        }
        return `${senderName} đã gửi cho bạn một tin nhắn mới`
      case NOTIFICATION_TYPE.LIKE:
        return `${senderName} đã thích bài viết của bạn`
      case NOTIFICATION_TYPE.NEW_COMMENT:
        // Nếu có nội dung tùy chỉnh, sử dụng nó
        if (notification.content) {
          return `${senderName} ${notification.content}`
        }
        // Nếu không có nội dung tùy chỉnh, sử dụng nội dung mặc định
        return `${senderName} đã bình luận về bài viết của bạn`
      case NOTIFICATION_TYPE.MENTION:
        return `${senderName} đã nhắc đến bạn trong một bình luận`
      case NOTIFICATION_TYPE.POST_LIKE:
        return `${senderName} đã thích bài viết của bạn`
      case NOTIFICATION_TYPE.POST_SHARE:
        return `${senderName} đã chia sẻ bài viết của bạn`
      default:
        return notification.content || `Bạn có một thông báo mới (${notification.type})`
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id='notification-trigger'
          variant='ghost'
          size='icon'
          className='bg-accent relative cursor-pointer rounded-full p-2'
          onClick={() => {
            setOpen(true)
            refetch()
          }}
        >
          <Bell className='size-5 text-gray-700 dark:text-gray-300' />
          {hasUnread && <span className='absolute top-0 right-0 h-2 w-2 rounded-full bg-blue-500'></span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-96 p-0' align='end'>
        <div className='flex items-center justify-between border-b px-4 py-3'>
          <h3 className='text-sm font-medium'>{notificationsT('title')}</h3>
          <div className='flex items-center space-x-2'>
            <div className='space-x-2 text-sm'>
              <Button
                variant='outline'
                onClick={() => setTab('all')}
                className={cn('rounded-full !bg-transparent px-3 py-1 text-sm', {
                  '!bg-muted': tab === 'all'
                })}
              >
                {notificationsT('all')}
              </Button>
              <Button
                variant='outline'
                onClick={() => setTab('unread')}
                className={cn('rounded-full !bg-transparent px-3 py-1 text-sm', {
                  '!bg-muted': tab === 'unread'
                })}
              >
                {notificationsT('unread')}
              </Button>
            </div>

            <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
              <PopoverTrigger asChild>
                <Button variant='ghost' size='icon'>
                  <MoreVertical className='h-4 w-4' />
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-56 p-0' side='bottom' align='end'>
                <div className='flex flex-col'>
                  <Button
                    variant='ghost'
                    className='flex items-center justify-start gap-2 rounded-none px-3 py-2 text-sm'
                    onClick={handleMarkAllAsRead}
                  >
                    <Check className='h-4 w-4' />
                    {notificationsT('markAllAsRead')}
                  </Button>
                  <Button
                    variant='ghost'
                    className='text-destructive hover:text-destructive flex items-center justify-start gap-2 rounded-none px-3 py-2 text-sm'
                    onClick={handleDeleteAllNotifications}
                  >
                    <Trash className='h-4 w-4' />
                    {notificationsT('deleteAll')}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
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
            <div className='text-muted-foreground p-4 text-center'>{notificationsT('loadError')}</div>
          ) : filteredNotifications?.length === 0 ? (
            // Empty state
            <div className='text-muted-foreground p-4 text-center'>
              {tab === 'all' ? notificationsT('noNotifications') : notificationsT('noUnreadNotifications')}
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
                <div className='text-muted-foreground p-2 text-center text-xs'>{notificationsT('noMoreNotifications')}</div>
              }
            >
              {filteredNotifications?.map((item: any) => {
                // Tạo biến tạm thời để kiểm tra trạng thái xử lý
                const isProcessed =
                  item.processed === true ||
                  (item.relatedId &&
                    item.relatedId.status &&
                    item.relatedId.status !== FRIEND_REQUEST_STATUS.PENDING) ||
                  processedIds.includes(item._id)

                // Lấy thông tin người gửi
                const senderName = item.senderId?.name || 'Người dùng'

                // Tạo nội dung thông báo dựa trên loại
                const notificationText = getNotificationContent(item)

                return (
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
                      <p className={cn('text-sm', !item.read ? 'font-medium' : 'text-muted-foreground')}>
                        {notificationText}
                      </p>
                      <span className='text-xs text-gray-500 dark:text-gray-400'>{formatTime(item.createdAt)}</span>

                      {/* Hiển thị nút chỉ khi là lời mời kết bạn và chưa được xử lý */}
                      {item.type === NOTIFICATION_TYPE.FRIEND_REQUEST && !isProcessed && (
                        <div className='mt-2 flex space-x-2'>
                          <Button
                            size='sm'
                            variant='default'
                            className='h-8 px-3 py-1'
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAcceptFriendRequest(e, item._id, item.senderId._id)
                            }}
                            disabled={isAccepting === item._id}
                          >
                            {isAccepting === item._id ? 'Đang xử lý...' : 'Chấp nhận'}
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            className='h-8 px-3 py-1'
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRejectFriendRequest(e, item._id, item.senderId._id)
                            }}
                            disabled={isRejecting === item._id}
                          >
                            {isRejecting === item._id ? 'Đang xử lý...' : 'Từ chối'}
                          </Button>
                        </div>
                      )}

                      {/* Hiển thị trạng thái đã xử lý */}
                      {item.type === NOTIFICATION_TYPE.FRIEND_REQUEST && isProcessed && (
                        <p className='text-muted-foreground mt-2 text-xs italic'>Đã xử lý lời mời kết bạn này</p>
                      )}
                    </div>
                    <div className='flex items-center'>
                      {!item.read && <div className='mx-2 h-2 w-2 rounded-full bg-blue-500' />}
                      <Button
                        variant='ghost'
                        size='icon'
                        className='ml-2 h-8 w-8 cursor-pointer rounded-full hover:bg-red-100 hover:text-red-500'
                        onClick={(e) => handleDeleteNotification(e, item._id)}
                      >
                        <Trash className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </InfiniteScroll>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default NotificationPopover
