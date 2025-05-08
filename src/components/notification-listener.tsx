'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useSocket } from '~/hooks/use-socket'
import SOCKET_EVENTS from '~/constants/socket-events'
import { useQueryClient } from '@tanstack/react-query'
import { NOTIFICATION_TYPE } from '~/constants/enums'

export default function NotificationListener() {
  const { socket } = useSocket()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!socket) return

    const handleNewNotification = (notification: any) => {
      console.log('New notification received in listener:', notification)
      
      // Invalidate notifications query
      queryClient.invalidateQueries({ queryKey: ['NOTIFICATIONS'] })
      
      // Show toast based on notification type
      const message = getNotificationMessage(notification)
      
      toast.info(message.title, {
        description: message.description,
        action: {
          label: 'Xem',
          onClick: () => {
            // Navigate to appropriate page based on notification type
            if (notification.type === NOTIFICATION_TYPE.FRIEND_REQUEST) {
              window.location.href = '/friends/requests'
            } else if (notification.type === NOTIFICATION_TYPE.NEW_MESSAGE) {
              window.location.href = `/messages/${notification.chatId || notification.relatedId}`
            } else {
              window.location.href = '/notifications'
            }
          }
        }
      })
    }

    // Đăng ký lắng nghe sự kiện thông báo mới
    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification)
    
    // Thêm log để kiểm tra socket đã kết nối
    console.log('NotificationListener initialized with socket ID:', socket.id)

    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification)
    }
  }, [socket, queryClient])

  return null
}

function getNotificationMessage(notification: any) {
  const { type, sender, senderId } = notification
  // Lấy thông tin người gửi từ cả hai nguồn có thể
  const senderInfo = sender || senderId
  const senderName = senderInfo?.name || 'Ai đó'
  
  switch (type) {
    case NOTIFICATION_TYPE.FRIEND_REQUEST:
      return {
        title: 'Lời mời kết bạn mới',
        description: `${senderName} đã gửi cho bạn lời mời kết bạn`
      }
    case NOTIFICATION_TYPE.FRIEND_ACCEPTED:
      return {
        title: 'Đã chấp nhận lời mời kết bạn',
        description: `${senderName} đã chấp nhận lời mời kết bạn của bạn`
      }
    case NOTIFICATION_TYPE.NEW_MESSAGE:
      return {
        title: 'Tin nhắn mới',
        description: `${senderName} đã gửi cho bạn một tin nhắn mới`
      }
    default:
      return {
        title: 'Thông báo mới',
        description: 'Bạn có một thông báo mới'
      }
  }
}

