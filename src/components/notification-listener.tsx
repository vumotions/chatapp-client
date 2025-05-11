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
      console.log('New notification received:', notification);
      
      // Xác định tên người gửi
      let senderName = 'Ai đó';
      
      if (notification.senderId && typeof notification.senderId === 'object' && notification.senderId.name) {
        senderName = notification.senderId.name;
      }
      
      // Kiểm tra loại thông báo
      if (notification.type === NOTIFICATION_TYPE.FRIEND_REQUEST) {
        // Kiểm tra xem người dùng đã thực hiện hành động gửi lời mời kết bạn chưa
        // Nếu đã thực hiện, không hiển thị toast
        const friendSuggestions = queryClient.getQueryData(['FRIEND_SUGGESTIONS']);
        
        if (friendSuggestions) {
          const hasJustSent = (friendSuggestions as any)?.pages?.flatMap((page: { suggestions: any[] }) => page.suggestions || []).some(
            (user: any) => user._id === notification.senderId._id && user.status === 'PENDING'
          );
          
          if (hasJustSent) {
            console.log('Skipping notification toast as user just sent the request');
            return;
          }
        }
      }
      
      // Hiển thị toast thông báo
      if (notification.type !== NOTIFICATION_TYPE.NEW_MESSAGE) {
        let message = 'Bạn có thông báo mới';
        
        switch (notification.type) {
          case NOTIFICATION_TYPE.FRIEND_REQUEST:
            message = `${senderName} đã gửi cho bạn lời mời kết bạn`;
            break;
          case NOTIFICATION_TYPE.FRIEND_ACCEPTED:
            message = `${senderName} đã chấp nhận lời mời kết bạn của bạn`;
            break;
        }
        
        toast(message, {
          description: 'Nhấp để xem chi tiết',
          action: {
            label: 'Xem',
            onClick: () => {
              document.getElementById('notification-trigger')?.click();
            }
          }
        });
      }
      
      // Cập nhật cache thông báo
      queryClient.invalidateQueries({ queryKey: ['NOTIFICATIONS'] });
    };

    // Đăng ký lắng nghe sự kiện NOTIFICATION_NEW
    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification);

    // Hủy đăng ký khi component unmount
    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification);
    };
  }, [socket, queryClient]);

  return null;
}


