'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { NOTIFICATION_TYPE } from '~/constants/enums'
import SOCKET_EVENTS from '~/constants/socket-events'
import { useSocket } from '~/hooks/use-socket'

export default function NotificationListener() {
  const { socket } = useSocket()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const currentUserId = session?.user?._id

  useEffect(() => {
    if (!socket || !currentUserId) return

    const handleNewNotification = (notification: any) => {
      console.log('Received new notification via socket:', notification)

      // Kiểm tra nếu là thông báo chấp nhận lời mời kết bạn
      if (notification.type === NOTIFICATION_TYPE.FRIEND_ACCEPTED) {
        // Invalidate các query liên quan đến bạn bè
        queryClient.invalidateQueries({ queryKey: ['FRIENDS'] })
        queryClient.invalidateQueries({ queryKey: ['FRIEND_STATUS'] })
        queryClient.invalidateQueries({ queryKey: ['FRIEND_SUGGESTIONS'] })
      }

      // Hiển thị toast thông báo
      if (notification) {
        let message = ''
        const senderName = notification.sender?.name || notification.senderId?.name || 'Ai đó'

        switch (notification.type) {
          case NOTIFICATION_TYPE.FRIEND_REQUEST:
            message = `${senderName} đã gửi lời mời kết bạn`
            break
          case NOTIFICATION_TYPE.FRIEND_ACCEPTED:
            message = `${senderName} đã chấp nhận lời mời kết bạn của bạn`
            break
          case NOTIFICATION_TYPE.JOIN_REQUEST:
            if (notification.metadata?.chatName) {
              if (notification.metadata.userIds && notification.metadata.userIds.length > 0) {
                message = `${senderName} đã mời ${notification.metadata.userIds.length} người vào nhóm "${notification.metadata.chatName}"`
              } else {
                message = `${senderName} muốn tham gia nhóm "${notification.metadata.chatName}"`
              }
            } else {
              message = `${senderName} muốn tham gia nhóm của bạn`
            }
            break
          case NOTIFICATION_TYPE.NEW_MESSAGE:
            // Bỏ qua thông báo tin nhắn mới vì đã được xử lý trong socket-provider
            return
          default:
            message = notification.content || 'Bạn có thông báo mới'
        }

        // Hiển thị toast nếu không phải là cập nhật
        if (!notification.isUpdate) {
          toast(message, {
            position: 'bottom-left',
            description: 'Nhấp để xem chi tiết',
            action: {
              label: 'Xem',
              onClick: () => {
                document.getElementById('notification-trigger')?.click()
              }
            }
          })
        }
      }

      // Cập nhật cache thông báo trực tiếp
      updateNotificationCache(notification)
    }

    // Hàm cập nhật cache thông báo
    const updateNotificationCache = (newNotification: any) => {
      // Cập nhật cache cho danh sách thông báo vô hạn
      queryClient.setQueryData(['NOTIFICATIONS'], (oldData: any) => {
        if (!oldData) return { pages: [{ notifications: [newNotification], hasMore: true }] }

        // Thêm thông báo mới vào trang đầu tiên
        const updatedPages = [...oldData.pages]
        if (updatedPages.length > 0) {
          // Thêm thông báo mới vào đầu danh sách
          updatedPages[0] = {
            ...updatedPages[0],
            notifications: [newNotification, ...(updatedPages[0].notifications || [])]
          }
        }

        return {
          ...oldData,
          pages: updatedPages
        }
      })

      // Cập nhật số lượng thông báo chưa đọc
      queryClient.setQueryData(['UNREAD_NOTIFICATIONS_COUNT'], (oldCount: number = 0) => {
        return newNotification.read ? oldCount : oldCount + 1
      })
    }

    // Đăng ký lắng nghe sự kiện NOTIFICATION_NEW
    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification)

    // Đăng ký lắng nghe sự kiện NEW_JOIN_REQUEST
    socket.on(SOCKET_EVENTS.NEW_JOIN_REQUEST, (data: any) => {
      console.log('Received NEW_JOIN_REQUEST event:', data)

      // Nếu không có thông báo đầy đủ, tạo một thông báo tạm thời
      if (!data.type) {
        const tempNotification = {
          _id: Date.now().toString(),
          userId: currentUserId,
          sender: {
            _id: data.invitedBy || data.userId,
            name: 'Người dùng',
            avatar: ''
          },
          type: NOTIFICATION_TYPE.JOIN_REQUEST,
          content: 'Có yêu cầu tham gia mới vào nhóm',
          metadata: {
            conversationId: data.conversationId,
            userIds: data.userIds || [data.userId]
          },
          read: false,
          createdAt: new Date().toISOString()
        }

        // Cập nhật cache với thông báo tạm thời
        updateNotificationCache(tempNotification)

        // Hiển thị toast
        toast('Có yêu cầu tham gia mới vào nhóm', {
          position: 'bottom-left',
          description: 'Nhấp để xem chi tiết',
          action: {
            label: 'Xem',
            onClick: () => {
              document.getElementById('notification-trigger')?.click()
            }
          }
        })
      }
    })

    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification)
      socket.off(SOCKET_EVENTS.NEW_JOIN_REQUEST)
    }
  }, [socket, queryClient, currentUserId])

  return null
}
